"""
Checkers game logic. English rules: 8x8 board, black moves first.
Board coordinates: row 0 at top, col 0 at left. Black starts at top (rows 0-2).
"""

# Piece types
EMPTY = 0
BLACK = 1
RED = 2
BLACK_KING = 3
RED_KING = 4

# Board size
BOARD_SIZE = 8

# Initial board: black at top (rows 0-2), red at bottom (rows 5-7)
# Only dark squares are playable (row + col even)
def initial_board():
    board = [[EMPTY] * BOARD_SIZE for _ in range(BOARD_SIZE)]
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            if (row + col) % 2 == 1:  # dark squares
                if row < 3:
                    board[row][col] = BLACK
                elif row > 4:
                    board[row][col] = RED
    return board


def is_black(piece):
    return piece in (BLACK, BLACK_KING)


def is_red(piece):
    return piece in (RED, RED_KING)


def is_king(piece):
    return piece in (BLACK_KING, RED_KING)


def get_owner(piece):
    if is_black(piece):
        return "black"
    if is_red(piece):
        return "red"
    return None


def get_valid_moves(board, row, col):
    """Return list of (to_row, to_col) for valid non-jump moves from (row, col)."""
    piece = board[row][col]
    if piece == EMPTY:
        return []
    moves = []
    # Black moves down (row increases), Red moves up (row decreases)
    # Kings can move both directions
    directions = []
    if piece in (BLACK, BLACK_KING):
        directions.append((1, -1))   # down-left
        directions.append((1, 1))    # down-right
    if piece in (RED, RED_KING):
        directions.append((-1, -1))  # up-left
        directions.append((-1, 1))   # up-right
    for dr, dc in directions:
        nr, nc = row + dr, col + dc
        if 0 <= nr < BOARD_SIZE and 0 <= nc < BOARD_SIZE and board[nr][nc] == EMPTY:
            moves.append((nr, nc))
    return moves


def get_valid_jumps(board, row, col):
    """Return list of (to_row, to_col, jump_row, jump_col) for valid jumps."""
    piece = board[row][col]
    if piece == EMPTY:
        return []
    jumps = []
    directions = []
    if piece in (BLACK, BLACK_KING):
        directions.extend([(1, -1), (1, 1)])
    if piece in (RED, RED_KING):
        directions.extend([(-1, -1), (-1, 1)])
    for dr, dc in directions:
        mr, mc = row + dr, col + dc
        jr, jc = row + 2 * dr, col + 2 * dc
        if 0 <= jr < BOARD_SIZE and 0 <= jc < BOARD_SIZE:
            mid = board[mr][mc]
            if board[jr][jc] == EMPTY and mid != EMPTY and get_owner(mid) != get_owner(piece):
                jumps.append((jr, jc, mr, mc))
    return jumps


def must_jump(board, color):
    """Check if any piece of this color has a mandatory jump."""
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            piece = board[row][col]
            if piece != EMPTY and get_owner(piece) == color:
                if get_valid_jumps(board, row, col):
                    return True
    return False


def get_all_moves(board, color):
    """Return all valid moves for color. Jumps are mandatory if any exist."""
    moves = []
    has_jump = False
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            piece = board[row][col]
            if piece != EMPTY and get_owner(piece) == color:
                jumps = get_valid_jumps(board, row, col)
                if jumps:
                    has_jump = True
                    for jr, jc, _, _ in jumps:
                        moves.append((row, col, jr, jc, True))
    if has_jump:
        return [m for m in moves if m[4]]
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            piece = board[row][col]
            if piece != EMPTY and get_owner(piece) == color:
                for nr, nc in get_valid_moves(board, row, col):
                    moves.append((row, col, nr, nc, False))
    return moves


def apply_move(board, from_row, from_col, to_row, to_col):
    """Apply a move. Returns new board and captured (jump_row, jump_col) or None."""
    new_board = [row[:] for row in board]
    piece = new_board[from_row][from_col]
    new_board[from_row][from_col] = EMPTY
    new_board[to_row][to_col] = piece
    jump = None
    if abs(to_row - from_row) == 2:
        jump = ((from_row + to_row) // 2, (from_col + to_col) // 2)
        new_board[jump[0]][jump[1]] = EMPTY
    # Promote to king
    if piece == BLACK and to_row == BOARD_SIZE - 1:
        new_board[to_row][to_col] = BLACK_KING
    elif piece == RED and to_row == 0:
        new_board[to_row][to_col] = RED_KING
    return new_board, jump


def check_winner(board):
    """Return 'black', 'red', or None."""
    black_count = red_count = 0
    black_can_move = red_can_move = False
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            p = board[row][col]
            if is_black(p):
                black_count += 1
            elif is_red(p):
                red_count += 1
    if black_count == 0:
        return "red"
    if red_count == 0:
        return "black"
    for m in get_all_moves(board, "black"):
        black_can_move = True
        break
    for m in get_all_moves(board, "red"):
        red_can_move = True
        break
    if not black_can_move:
        return "red"
    if not red_can_move:
        return "black"
    return None


def board_to_state(board):
    """Serialize board for JSON."""
    return [[int(p) for p in row] for row in board]
