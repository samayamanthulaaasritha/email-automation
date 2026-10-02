import os
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from utils.validation import is_valid_email, normalize_selection, find_best_header_match

NAME_ALIASES = [
    "name", "candidate name", "student name", "full name", 
    "recipient name", "applicant name", "person name", "first name"
]

EMAIL_ALIASES = [
    "email", "email address", "e-mail", "e-mail address", 
    "mail", "student email", "candidate email", "applicant email"
]

SELECTION_ALIASES = [
    "selection", "selection status", "status", "result", 
    "selected", "decision", "round status", "shortlisted"
]

def parse_excel_file(file_path: str, column_mapping: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Parses an uploaded Excel file (.xlsx or .xls), detects or applies column mapping,
    and categorizes every row strictly according to business logic.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Excel file not found at {file_path}")
        
    try:
        # Read Excel using pandas
        df = pd.read_excel(file_path, dtype=str)
    except Exception as e:
        raise ValueError(f"Failed to read Excel file: {str(e)}")
        
    if df.empty:
        raise ValueError("The uploaded Excel file contains no records.")
        
    # Strip whitespace from column headers
    df.columns = [str(c).strip() for c in df.columns]
    headers = list(df.columns)
    
    # Identify or validate column mapping
    name_col = None
    email_col = None
    selection_col = None
    
    if column_mapping:
        name_col = column_mapping.get("name_column")
        email_col = column_mapping.get("email_column")
        selection_col = column_mapping.get("selection_column")
    
    # Auto-detect if not provided or missing
    if not name_col or name_col not in headers:
        name_col = find_best_header_match(headers, NAME_ALIASES)
    if not email_col or email_col not in headers:
        email_col = find_best_header_match(headers, EMAIL_ALIASES)
    if not selection_col or selection_col not in headers:
        selection_col = find_best_header_match(headers, SELECTION_ALIASES)
        
    detection_confident = bool(name_col and email_col and selection_col)
    
    # Replace NaN with empty string
    df = df.replace({np.nan: ""})
    
    total_rows = len(df)
    selected_count = 0
    not_selected_count = 0
    unknown_count = 0
    missing_email_count = 0
    valid_selected_recipients_count = 0
    
    rows_data = []
    valid_recipients = []
    
    for idx, row in df.iterrows():
        row_dict = {col: str(row[col]).strip() if row[col] is not None else "" for col in headers}
        
        name_val = row_dict.get(name_col, f"Recipient #{idx + 1}") if name_col else f"Recipient #{idx + 1}"
        raw_email = row_dict.get(email_col, "") if email_col else ""
        raw_selection = row_dict.get(selection_col, "") if selection_col else ""
        
        normalized_sel = normalize_selection(raw_selection)
        has_valid_email = is_valid_email(raw_email)
        
        # Categorize
        if normalized_sel == "Selected":
            selected_count += 1
            if not raw_email:
                status = "Missing Email"
                missing_email_count += 1
                can_send = False
            elif not has_valid_email:
                status = "Invalid Email"
                can_send = False
            else:
                status = "Ready"
                valid_selected_recipients_count += 1
                can_send = True
        elif normalized_sel == "Not Selected":
            not_selected_count += 1
            status = "Skipped — Not Selected"
            can_send = False
        else: # Unknown, blank, pending, etc.
            unknown_count += 1
            status = "Skipped — Unknown Selection Status"
            can_send = False
            
        row_info = {
            "row_index": idx,
            "name": name_val,
            "email": raw_email,
            "raw_selection": raw_selection,
            "selection": normalized_sel,
            "status": status,
            "can_send": can_send,
            "custom_data": row_dict
        }
        rows_data.append(row_info)
        
        if can_send:
            valid_recipients.append(row_info)
            
    return {
        "headers": headers,
        "mapped_columns": {
            "name_column": name_col,
            "email_column": email_col,
            "selection_column": selection_col
        },
        "detection_confident": detection_confident,
        "summary": {
            "total_rows": total_rows,
            "selected_count": selected_count,
            "not_selected_count": not_selected_count,
            "unknown_count": unknown_count,
            "missing_email_count": missing_email_count,
            "valid_selected_recipients": valid_selected_recipients_count
        },
        "rows": rows_data,
        "valid_recipients": valid_recipients
    }
