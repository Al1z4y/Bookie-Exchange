"""
In-app messaging routes.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.message import Message
from app.schemas.messages import (
    MessageCreate,
    MessageResponse,
    MessageListResponse,
    ConversationResponse,
)

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to another user.
    
    - **recipient_id**: ID of the recipient user
    - **subject**: Optional message subject
    - **content**: Message content
    
    Requires authentication.
    """
    # Check if recipient exists
    recipient = db.query(User).filter(User.id == message_data.recipient_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found"
        )
    
    # Can't send message to yourself
    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a message to yourself"
        )
    
    # Create message
    message = Message(
        sender_id=current_user.id,
        recipient_id=message_data.recipient_id,
        subject=message_data.subject,
        content=message_data.content,
        is_read=False,
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return MessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        sender_username=current_user.username,
        recipient_id=message.recipient_id,
        recipient_username=recipient.username,
        subject=message.subject,
        content=message.content,
        is_read=message.is_read,
        created_at=message.created_at,
        read_at=message.read_at,
    )


@router.get("", response_model=MessageListResponse)
async def get_messages(
    folder: str = Query("inbox", description="Folder: inbox, sent, all"),
    is_read: bool = Query(None, description="Filter by read status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's messages.
    
    Requires authentication.
    """
    # Eager load users to avoid N+1 queries
    from sqlalchemy.orm import joinedload
    
    # Build base query with eager loading
    base_query = db.query(Message).options(
        joinedload(Message.sender),
        joinedload(Message.recipient)
    )
    
    # Apply folder filter
    if folder == "inbox":
        query = base_query.filter(Message.recipient_id == current_user.id)
    elif folder == "sent":
        query = base_query.filter(Message.sender_id == current_user.id)
    else:  # all
        query = base_query.filter(
            or_(
                Message.sender_id == current_user.id,
                Message.recipient_id == current_user.id
            )
        )
    
    # Filter by read status
    if is_read is not None:
        query = query.filter(Message.is_read == is_read)
    
    # Get total count (before pagination)
    total = query.count()
    
    # Get unread count for inbox
    unread_count = db.query(func.count(Message.id)).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    messages = query.order_by(Message.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    # Convert to response format
    message_responses = []
    for message in messages:
        message_responses.append(MessageResponse(
            id=message.id,
            sender_id=message.sender_id,
            sender_username=message.sender.username if message.sender else "",
            recipient_id=message.recipient_id,
            recipient_username=message.recipient.username if message.recipient else "",
            subject=message.subject,
            content=message.content,
            is_read=message.is_read,
            created_at=message.created_at,
            read_at=message.read_at,
        ))
    
    return MessageListResponse(
        messages=message_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        unread_count=unread_count,
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all conversations for current user.
    
    Returns list of conversations with other users, including last message and unread count.
    """
    # Get all unique users the current user has messaged with
    sent_to = db.query(Message.recipient_id).filter(Message.sender_id == current_user.id).distinct().all()
    received_from = db.query(Message.sender_id).filter(Message.recipient_id == current_user.id).distinct().all()
    
    # Combine and get unique user IDs
    user_ids = set()
    for row in sent_to:
        user_ids.add(row[0])
    for row in received_from:
        user_ids.add(row[0])
    
    # Eager load all users at once to avoid N+1 queries
    from sqlalchemy.orm import joinedload
    user_ids_list = list(user_ids)
    
    # Get all users in one query
    users_dict = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids_list)).all()}
    
    # Get all last messages with eager loading
    last_messages = db.query(Message).options(
        joinedload(Message.sender),
        joinedload(Message.recipient)
    ).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.recipient_id.in_(user_ids_list)),
            and_(Message.sender_id.in_(user_ids_list), Message.recipient_id == current_user.id)
        )
    ).order_by(Message.created_at.desc()).all()
    
    # Group by user_id and get the most recent message per user
    last_message_by_user = {}
    for msg in last_messages:
        other_user_id = msg.recipient_id if msg.sender_id == current_user.id else msg.sender_id
        if other_user_id not in last_message_by_user:
            last_message_by_user[other_user_id] = msg
    
    # Get unread counts for all users at once
    unread_counts = {}
    unread_messages = db.query(
        Message.sender_id,
        func.count(Message.id).label('count')
    ).filter(
        Message.sender_id.in_(user_ids_list),
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).group_by(Message.sender_id).all()
    
    for sender_id, count in unread_messages:
        unread_counts[sender_id] = count
    
    conversations = []
    for user_id in user_ids_list:
        last_message = last_message_by_user.get(user_id)
        if last_message and user_id in users_dict:
            other_user = users_dict[user_id]
            conversations.append(ConversationResponse(
                other_user_id=user_id,
                other_username=other_user.username,
                last_message=MessageResponse(
                    id=last_message.id,
                    sender_id=last_message.sender_id,
                    sender_username=last_message.sender.username if last_message.sender else "",
                    recipient_id=last_message.recipient_id,
                    recipient_username=last_message.recipient.username if last_message.recipient else "",
                    subject=last_message.subject,
                    content=last_message.content,
                    is_read=last_message.is_read,
                    created_at=last_message.created_at,
                    read_at=last_message.read_at,
                ),
                unread_count=unread_counts.get(user_id, 0),
                messages=[],
            ))
    
    # Sort by last message time
    conversations.sort(key=lambda c: c.last_message.created_at, reverse=True)
    
    return conversations


@router.get("/conversations/{user_id}", response_model=list[MessageResponse])
async def get_conversation(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get conversation thread with a specific user.
    """
    # Check if user exists
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get messages between current user and other user
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.recipient_id == user_id),
            and_(Message.sender_id == user_id, Message.recipient_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Mark messages as read if current user is recipient
    for message in messages:
        if message.recipient_id == current_user.id and not message.is_read:
            message.is_read = True
            message.read_at = datetime.utcnow()
    
    db.commit()
    
    message_responses = []
    for message in messages:
        sender = db.query(User).filter(User.id == message.sender_id).first()
        recipient = db.query(User).filter(User.id == message.recipient_id).first()
        
        message_responses.append(MessageResponse(
            id=message.id,
            sender_id=message.sender_id,
            sender_username=sender.username if sender else "",
            recipient_id=message.recipient_id,
            recipient_username=recipient.username if recipient else "",
            subject=message.subject,
            content=message.content,
            is_read=message.is_read,
            created_at=message.created_at,
            read_at=message.read_at,
        ))
    
    return message_responses


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get message by ID.
    
    Only the sender or recipient can view the message.
    Mark message as read if current user is the recipient.
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify user is part of conversation
    if message.sender_id != current_user.id and message.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view messages you sent or received"
        )
    
    # Mark as read if recipient
    if message.recipient_id == current_user.id and not message.is_read:
        message.is_read = True
        message.read_at = datetime.utcnow()
        db.commit()
        db.refresh(message)
    
    sender = db.query(User).filter(User.id == message.sender_id).first()
    recipient = db.query(User).filter(User.id == message.recipient_id).first()
    
    return MessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        sender_username=sender.username if sender else "",
        recipient_id=message.recipient_id,
        recipient_username=recipient.username if recipient else "",
        subject=message.subject,
        content=message.content,
        is_read=message.is_read,
        created_at=message.created_at,
        read_at=message.read_at,
    )


@router.put("/{message_id}/read", response_model=MessageResponse)
async def mark_as_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark message as read.
    
    Only the recipient can mark a message as read.
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify user is recipient
    if message.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recipient can mark a message as read"
        )
    
    message.is_read = True
    message.read_at = datetime.utcnow()
    db.commit()
    db.refresh(message)
    
    sender = db.query(User).filter(User.id == message.sender_id).first()
    recipient = db.query(User).filter(User.id == message.recipient_id).first()
    
    return MessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        sender_username=sender.username if sender else "",
        recipient_id=message.recipient_id,
        recipient_username=recipient.username if recipient else "",
        subject=message.subject,
        content=message.content,
        is_read=message.is_read,
        created_at=message.created_at,
        read_at=message.read_at,
    )


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all messages as read for current user.
    """
    unread_messages = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).all()
    
    for message in unread_messages:
        message.is_read = True
        message.read_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"Marked {len(unread_messages)} messages as read"}


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a message.
    
    Users can delete their own sent messages or received messages.
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify user is sender or recipient
    if message.sender_id != current_user.id and message.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete messages you sent or received"
        )
    
    db.delete(message)
    db.commit()
    
    return None


@router.get("/unread/count", status_code=status.HTTP_200_OK)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get count of unread messages for current user.
    """
    unread_count = db.query(func.count(Message.id)).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).scalar() or 0
    
    return {"unread_count": unread_count}
