import re

# Comprehensive email validation regex
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)

def is_valid_email(email: str) -> bool:
    """Validate email address format strictly."""
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if len(email) < 5 or len(email) > 254:
        return False
    return bool(EMAIL_REGEX.match(email))

def normalize_selection(val) -> str:
    """
    Normalizes selection status value according to strict business logic:
    - 'selected' (case-insensitive, trimmed) -> 'Selected'
    - 'not selected' (case-insensitive, trimmed) -> 'Not Selected'
    - Any other value (Blank, Pending, Under Review, Maybe, etc.) -> 'Unknown'
    """
    if val is None:
        return "Unknown"
    
    text = str(val).strip().lower()
    
    # Check if empty string or NaN
    if not text or text == "nan" or text == "none" or text == "null" or text == "n/a":
        return "Unknown"
    
    # Exact check for selected
    if text == "selected":
        return "Selected"
    
    # Exact check for not selected
    if text in ["not selected", "not-selected", "not_selected", "unselected"]:
        return "Not Selected"
        
    return "Unknown"

def find_best_header_match(headers, candidates):
    """
    Tries to match header names against candidate keywords (case-insensitive).
    """
    lower_headers = {h.strip().lower(): h for h in headers if isinstance(h, str)}
    
    for candidate in candidates:
        candidate_lower = candidate.lower()
        if candidate_lower in lower_headers:
            return lower_headers[candidate_lower]
            
    # Fuzzy contains match
    for h_lower, orig in lower_headers.items():
        for candidate in candidates:
            if candidate.lower() in h_lower:
                return orig
                
    return None
