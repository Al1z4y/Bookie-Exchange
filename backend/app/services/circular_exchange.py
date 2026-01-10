"""
Circular exchange prevention using graph theory.
Detects cycles in exchange graph to prevent point farming.
"""
from typing import Dict, List, Set
from sqlalchemy.orm import Session
from app.models.exchange import ExchangeRequest, ExchangeStatus
from app.models.book import Book


class ExchangeGraph:
    """
    Graph representation of exchanges for cycle detection.
    Nodes are user IDs, edges represent exchange requests.
    """
    
    def __init__(self):
        self.graph: Dict[int, List[int]] = {}  # user_id -> [list of user_ids they're exchanging with]
    
    def add_edge(self, from_user: int, to_user: int):
        """Add a directed edge from from_user to to_user."""
        if from_user not in self.graph:
            self.graph[from_user] = []
        if to_user not in self.graph[from_user]:
            self.graph[from_user].append(to_user)
    
    def has_cycle(self, start_user: int) -> bool:
        """
        Check if adding an exchange from start_user would create a cycle.
        Uses DFS to detect cycles.
        
        Returns:
            True if cycle exists, False otherwise
        """
        visited: Set[int] = set()
        rec_stack: Set[int] = set()
        
        def dfs(node: int) -> bool:
            """DFS helper to detect cycles."""
            visited.add(node)
            rec_stack.add(node)
            
            # Check all neighbors
            for neighbor in self.graph.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    # Back edge found - cycle detected
                    return True
            
            rec_stack.remove(node)
            return False
        
        # Check for cycles starting from start_user
        if start_user not in visited:
            if dfs(start_user):
                return True
        
        return False
    
    def would_create_cycle(self, from_user: int, to_user: int) -> bool:
        """
        Check if adding an edge from from_user to to_user would create a cycle.
        Temporarily adds the edge and checks for cycles.
        """
        # Add temporary edge
        if from_user not in self.graph:
            self.graph[from_user] = []
        self.graph[from_user].append(to_user)
        
        # Check for cycle
        has_cycle = self.has_cycle(from_user)
        
        # Remove temporary edge
        self.graph[from_user].remove(to_user)
        if not self.graph[from_user]:
            del self.graph[from_user]
        
        return has_cycle


def build_exchange_graph(db: Session, exclude_exchange_id: int = None) -> ExchangeGraph:
    """
    Build exchange graph from database.
    Only includes PENDING and APPROVED exchanges (not COMPLETED ones).
    COMPLETED exchanges don't create circular risks since ownership has already transferred.
    
    Args:
        db: Database session
        exclude_exchange_id: Exchange ID to exclude from graph (for checking new exchanges)
    
    Returns:
        ExchangeGraph instance
    """
    graph = ExchangeGraph()
    
    # Only consider PENDING and APPROVED exchanges for circular detection
    # COMPLETED exchanges have already transferred ownership, so they don't create circular risks
    query = db.query(ExchangeRequest).filter(
        ExchangeRequest.status.in_([
            ExchangeStatus.PENDING,
            ExchangeStatus.APPROVED
        ])
    )
    
    if exclude_exchange_id:
        query = query.filter(ExchangeRequest.id != exclude_exchange_id)
    
    exchanges = query.all()
    
    # Build graph edges
    for exchange in exchanges:
        # Edge: requester -> owner (requester wants owner's book)
        # This represents an active "debt" or pending exchange
        graph.add_edge(exchange.requester_id, exchange.owner_id)
    
    return graph


def check_circular_exchange(
    requester_id: int,
    owner_id: int,
    db: Session,
    exclude_exchange_id: int = None
):
    """
    Check if an exchange would create a circular exchange pattern.
    Only checks for cycles involving the same users.
    
    A circular exchange would be:
    - User A requests book from User B (pending/approved)
    - User B requests book from User A (pending/approved)
    This creates a cycle: A -> B -> A
    
    Args:
        requester_id: User ID requesting the book
        owner_id: User ID owning the book
        db: Database session
        exclude_exchange_id: Exchange ID to exclude (for updates)
    
    Returns:
        Tuple of (is_circular: bool, message: str)
    """
    # Don't check for circular exchanges if requester and owner are the same
    if requester_id == owner_id:
        return False, ""
    
    # Build exchange graph (only PENDING and APPROVED exchanges)
    # COMPLETED exchanges are excluded because ownership has already transferred
    graph = build_exchange_graph(db, exclude_exchange_id)
    
    # Check if adding requester -> owner would create a cycle
    # This happens if there's already a path from owner back to requester
    # The would_create_cycle function temporarily adds the edge and checks for cycles
    would_create_cycle = graph.would_create_cycle(requester_id, owner_id)
    
    if would_create_cycle:
        return True, "This exchange would create a circular exchange pattern between you and the book owner, which is not allowed to prevent point farming."
    
    return False, ""


def detect_exchange_cycles(db: Session) -> List[List[int]]:
    """
    Detect all cycles in the current exchange graph.
    Returns list of cycles (each cycle is a list of user IDs).
    """
    graph = build_exchange_graph(db)
    cycles = []
    visited: Set[int] = set()
    
    def dfs_cycle(node: int, path: List[int]) -> None:
        """DFS to find cycles."""
        if node in path:
            # Cycle found
            cycle_start = path.index(node)
            cycle = path[cycle_start:] + [node]
            cycles.append(cycle)
            return
        
        if node in visited:
            return
        
        visited.add(node)
        path.append(node)
        
        for neighbor in graph.graph.get(node, []):
            dfs_cycle(neighbor, path.copy())
        
        path.pop()
    
    # Check all nodes
    for node in graph.graph.keys():
        if node not in visited:
            dfs_cycle(node, [])
    
    return cycles
