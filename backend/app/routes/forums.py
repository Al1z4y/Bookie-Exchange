"""
Forum and discussion management routes.
Includes abuse detection and anonymous posting.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc, asc

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.forum import ForumPost, ForumReply, ForumVote
from app.schemas.forums import (
    ForumPostCreate,
    ForumPostUpdate,
    ForumPostResponse,
    ForumReplyCreate,
    ForumReplyResponse,
    ForumPostListResponse,
)

router = APIRouter(prefix="/forums", tags=["forums"])


def detect_abuse(content: str) -> bool:
    """
    Simple abuse detection (can be enhanced with ML/AI).
    Checks for common abusive patterns.
    """
    abuse_keywords = [
        "spam", "scam", "fake",  # Add more as needed
    ]
    
    content_lower = content.lower()
    # Check for excessive repetition (spam detection)
    words = content_lower.split()
    if len(words) > 0:
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
            if word_counts[word] > 10:  # Same word repeated more than 10 times
                return True
    
    # Check for abuse keywords (simple check)
    # In production, use more sophisticated NLP/AI models
    for keyword in abuse_keywords:
        if keyword in content_lower and content_lower.count(keyword) > 3:
            return True
    
    return False


@router.post("/posts", response_model=ForumPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: ForumPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new forum post.
    
    - **title**: Post title
    - **content**: Post content
    - **is_anonymous**: Whether to post anonymously
    - **tags**: List of tags for the post
    
    Requires authentication.
    """
    # Abuse detection
    if detect_abuse(post_data.content) or detect_abuse(post_data.title):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post content violates community guidelines"
        )
    
    # Create post
    post = ForumPost(
        title=post_data.title,
        content=post_data.content,
        author_id=None if post_data.is_anonymous else current_user.id,
        is_anonymous=post_data.is_anonymous,
        tags=post_data.tags or [],
        upvotes=0,
        downvotes=0,
        reply_count=0,
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    author_username = None if post_data.is_anonymous else current_user.username
    
    return ForumPostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        author_id=post.author_id,
        author_username=author_username,
        is_anonymous=post.is_anonymous,
        tags=post.tags if isinstance(post.tags, list) else [],
        upvotes=post.upvotes,
        downvotes=post.downvotes,
        reply_count=post.reply_count,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


@router.get("/posts", response_model=ForumPostListResponse)
async def list_posts(
    query: str = Query(None, description="Search query"),
    tags: str = Query(None, description="Comma-separated tags"),
    author_id: int = Query(None, description="Filter by author ID"),
    sort_by: str = Query("created_at", description="Sort by: created_at, upvotes, replies"),
    order: str = Query("desc", description="Order: asc, desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List forum posts with search and filtering.
    """
    posts_query = db.query(ForumPost)
    
    # Search query
    if query:
        search_term = f"%{query}%"
        posts_query = posts_query.filter(
            or_(
                ForumPost.title.ilike(search_term),
                ForumPost.content.ilike(search_term)
            )
        )
    
    # Filter by tags
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        # Filter posts that have any of the specified tags
        for tag in tag_list:
            posts_query = posts_query.filter(
                func.json_extract(ForumPost.tags, '$').contains(tag)
            )
    
    # Filter by author
    if author_id:
        posts_query = posts_query.filter(ForumPost.author_id == author_id)
    
    # Sorting
    if sort_by == "upvotes":
        order_func = desc(ForumPost.upvotes) if order == "desc" else asc(ForumPost.upvotes)
    elif sort_by == "replies":
        order_func = desc(ForumPost.reply_count) if order == "desc" else asc(ForumPost.reply_count)
    else:  # created_at
        order_func = desc(ForumPost.created_at) if order == "desc" else asc(ForumPost.created_at)
    
    posts_query = posts_query.order_by(order_func)
    
    # Get total count
    total = posts_query.count()
    
    # Eager load authors to avoid N+1 queries
    from sqlalchemy.orm import joinedload
    posts_query = posts_query.options(joinedload(ForumPost.author))
    
    # Apply pagination
    offset = (page - 1) * page_size
    posts = posts_query.offset(offset).limit(page_size).all()
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    # Convert to response format
    post_responses = []
    for post in posts:
        author_username = None
        if not post.is_anonymous and post.author_id and post.author:
            author_username = post.author.username
        
        post_responses.append(ForumPostResponse(
            id=post.id,
            title=post.title,
            content=post.content,
            author_id=post.author_id,
            author_username=author_username,
            is_anonymous=post.is_anonymous,
            tags=post.tags if isinstance(post.tags, list) else [],
            upvotes=post.upvotes,
            downvotes=post.downvotes,
            reply_count=post.reply_count,
            created_at=post.created_at,
            updated_at=post.updated_at,
        ))
    
    return ForumPostListResponse(
        posts=post_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/posts/{post_id}", response_model=ForumPostResponse)
async def get_post(
    post_id: int,
    db: Session = Depends(get_db)
):
    """
    Get forum post by ID.
    """
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    author_username = None
    if not post.is_anonymous and post.author_id:
        author = db.query(User).filter(User.id == post.author_id).first()
        author_username = author.username if author else None
    
    return ForumPostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        author_id=post.author_id,
        author_username=author_username,
        is_anonymous=post.is_anonymous,
        tags=post.tags if isinstance(post.tags, list) else [],
        upvotes=post.upvotes,
        downvotes=post.downvotes,
        reply_count=post.reply_count,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


@router.put("/posts/{post_id}", response_model=ForumPostResponse)
async def update_post(
    post_id: int,
    post_update: ForumPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update forum post.
    
    Only the post author can update their post.
    Requires authentication.
    """
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Verify ownership
    if post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own posts"
        )
    
    # Abuse detection
    if post_update.content and detect_abuse(post_update.content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post content violates community guidelines"
        )
    
    # Update fields
    if post_update.title is not None:
        post.title = post_update.title
    if post_update.content is not None:
        post.content = post_update.content
    if post_update.tags is not None:
        post.tags = post_update.tags
    
    db.commit()
    db.refresh(post)
    
    author_username = None
    if not post.is_anonymous and post.author_id:
        author = db.query(User).filter(User.id == post.author_id).first()
        author_username = author.username if author else None
    
    return ForumPostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        author_id=post.author_id,
        author_username=author_username,
        is_anonymous=post.is_anonymous,
        tags=post.tags if isinstance(post.tags, list) else [],
        upvotes=post.upvotes,
        downvotes=post.downvotes,
        reply_count=post.reply_count,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete forum post.
    
    Only the post author can delete their post.
    Requires authentication.
    """
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Verify ownership
    if post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts"
        )
    
    db.delete(post)
    db.commit()
    
    return None


@router.post("/posts/{post_id}/replies", response_model=ForumReplyResponse, status_code=status.HTTP_201_CREATED)
async def create_reply(
    post_id: int,
    reply_data: ForumReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a reply to a forum post.
    
    Requires authentication.
    """
    # Check if post exists
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Abuse detection
    if detect_abuse(reply_data.content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply content violates community guidelines"
        )
    
    # Create reply
    reply = ForumReply(
        post_id=post_id,
        content=reply_data.content,
        author_id=None if reply_data.is_anonymous else current_user.id,
        is_anonymous=reply_data.is_anonymous,
        upvotes=0,
        downvotes=0,
    )
    
    db.add(reply)
    
    # Update post reply count
    post.reply_count += 1
    
    db.commit()
    db.refresh(reply)
    
    author_username = None
    if not reply_data.is_anonymous:
        author_username = current_user.username
    
    return ForumReplyResponse(
        id=reply.id,
        post_id=reply.post_id,
        content=reply.content,
        author_id=reply.author_id,
        author_username=author_username,
        is_anonymous=reply.is_anonymous,
        upvotes=reply.upvotes,
        downvotes=reply.downvotes,
        created_at=reply.created_at,
        updated_at=reply.updated_at,
    )


@router.get("/posts/{post_id}/replies", response_model=list[ForumReplyResponse])
async def get_replies(
    post_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get replies for a forum post.
    """
    # Check if post exists
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    replies_query = db.query(ForumReply).filter(ForumReply.post_id == post_id)
    
    offset = (page - 1) * page_size
    replies = replies_query.order_by(ForumReply.created_at.asc()).offset(offset).limit(page_size).all()
    
    reply_responses = []
    for reply in replies:
        author_username = None
        if not reply.is_anonymous and reply.author_id:
            author = db.query(User).filter(User.id == reply.author_id).first()
            author_username = author.username if author else None
        
        reply_responses.append(ForumReplyResponse(
            id=reply.id,
            post_id=reply.post_id,
            content=reply.content,
            author_id=reply.author_id,
            author_username=author_username,
            is_anonymous=reply.is_anonymous,
            upvotes=reply.upvotes,
            downvotes=reply.downvotes,
            created_at=reply.created_at,
            updated_at=reply.updated_at,
        ))
    
    return reply_responses


@router.post("/posts/{post_id}/vote", status_code=status.HTTP_200_OK)
async def vote_post(
    post_id: int,
    vote_type: str = Query(..., description="Vote type: upvote or downvote"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Vote on a forum post.
    
    Requires authentication.
    """
    if vote_type not in ["upvote", "downvote"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vote type must be 'upvote' or 'downvote'"
        )
    
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user already voted
    existing_vote = db.query(ForumVote).filter(
        ForumVote.user_id == current_user.id,
        ForumVote.post_id == post_id,
        ForumVote.reply_id == None
    ).first()
    
    if existing_vote:
        # Update existing vote
        if existing_vote.vote_type == vote_type:
            # Remove vote (toggle off)
            if vote_type == "upvote":
                post.upvotes = max(0, post.upvotes - 1)
            else:
                post.downvotes = max(0, post.downvotes - 1)
            db.delete(existing_vote)
        else:
            # Change vote type
            if existing_vote.vote_type == "upvote":
                post.upvotes = max(0, post.upvotes - 1)
                post.downvotes += 1
            else:
                post.downvotes = max(0, post.downvotes - 1)
                post.upvotes += 1
            existing_vote.vote_type = vote_type
    else:
        # Create new vote
        vote = ForumVote(
            user_id=current_user.id,
            post_id=post_id,
            reply_id=None,
            vote_type=vote_type,
        )
        db.add(vote)
        
        if vote_type == "upvote":
            post.upvotes += 1
        else:
            post.downvotes += 1
    
    db.commit()
    
    return {"message": f"Vote {vote_type} recorded", "upvotes": post.upvotes, "downvotes": post.downvotes}


@router.post("/replies/{reply_id}/vote", status_code=status.HTTP_200_OK)
async def vote_reply(
    reply_id: int,
    vote_type: str = Query(..., description="Vote type: upvote or downvote"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Vote on a forum reply.
    
    Requires authentication.
    """
    if vote_type not in ["upvote", "downvote"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vote type must be 'upvote' or 'downvote'"
        )
    
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    # Check if user already voted
    existing_vote = db.query(ForumVote).filter(
        ForumVote.user_id == current_user.id,
        ForumVote.reply_id == reply_id
    ).first()
    
    if existing_vote:
        # Update existing vote
        if existing_vote.vote_type == vote_type:
            # Remove vote (toggle off)
            if vote_type == "upvote":
                reply.upvotes = max(0, reply.upvotes - 1)
            else:
                reply.downvotes = max(0, reply.downvotes - 1)
            db.delete(existing_vote)
        else:
            # Change vote type
            if existing_vote.vote_type == "upvote":
                reply.upvotes = max(0, reply.upvotes - 1)
                reply.downvotes += 1
            else:
                reply.downvotes = max(0, reply.downvotes - 1)
                reply.upvotes += 1
            existing_vote.vote_type = vote_type
    else:
        # Create new vote
        vote = ForumVote(
            user_id=current_user.id,
            post_id=None,
            reply_id=reply_id,
            vote_type=vote_type,
        )
        db.add(vote)
        
        if vote_type == "upvote":
            reply.upvotes += 1
        else:
            reply.downvotes += 1
    
    db.commit()
    
    return {"message": f"Vote {vote_type} recorded", "upvotes": reply.upvotes, "downvotes": reply.downvotes}


@router.put("/replies/{reply_id}", response_model=ForumReplyResponse)
async def update_reply(
    reply_id: int,
    reply_update: ForumReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update forum reply.
    
    Only the reply author can update their reply.
    Requires authentication.
    """
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    # Verify ownership
    if reply.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own replies"
        )
    
    # Abuse detection
    if detect_abuse(reply_update.content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply content violates community guidelines"
        )
    
    # Update content
    reply.content = reply_update.content
    
    db.commit()
    db.refresh(reply)
    
    author_username = None
    if not reply.is_anonymous and reply.author_id:
        author = db.query(User).filter(User.id == reply.author_id).first()
        author_username = author.username if author else None
    
    return ForumReplyResponse(
        id=reply.id,
        post_id=reply.post_id,
        content=reply.content,
        author_id=reply.author_id,
        author_username=author_username,
        is_anonymous=reply.is_anonymous,
        upvotes=reply.upvotes,
        downvotes=reply.downvotes,
        created_at=reply.created_at,
        updated_at=reply.updated_at,
    )


@router.delete("/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reply(
    reply_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete forum reply.
    
    Only the reply author can delete their reply.
    Requires authentication.
    """
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    # Verify ownership
    if reply.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own replies"
        )
    
    # Update post reply count
    post = db.query(ForumPost).filter(ForumPost.id == reply.post_id).first()
    if post:
        post.reply_count = max(0, post.reply_count - 1)
    
    db.delete(reply)
    db.commit()
    
    return None
