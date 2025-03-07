"""
Text and diff normalization utilities to handle line ending issues
when applying patches and searching for text.
"""

import re


def normalize_line_endings(text):
    """
    Normalize line endings to Unix style (LF).
    This helps with cross-platform compatibility when applying diffs.
    
    Args:
        text: The text to normalize
        
    Returns:
        The text with normalized line endings
    """
    if not text:
        return ""
    return text.replace('\r\n', '\n').replace('\r', '\n')


def aggressive_normalize(text):
    """
    Aggressively normalize text for comparison, handling both
    line endings and whitespace.
    
    Args:
        text: Text to normalize
        
    Returns:
        Normalized text with consistent line endings and whitespace
    """
    if not text:
        return ""
    
    # First, normalize line endings
    text = normalize_line_endings(text)
    
    # Ensure trailing newline
    if not text.endswith('\n'):
        text += '\n'
        
    return text


def normalize_hunk_lines(hunk):
    """
    Normalize line endings in a diff hunk.
    
    Args:
        hunk: List of diff hunk lines
        
    Returns:
        Normalized hunk lines
    """
    if not hunk:
        return []
        
    return [normalize_line_endings(line) for line in hunk]


def robust_search_replace(search_text, replace_text, content):
    """
    Perform a robust search and replace operation that handles
    line ending differences and provides multiple fallbacks.
    
    Args:
        search_text: Text to search for
        replace_text: Text to replace with
        content: Content to modify
        
    Returns:
        Modified content or None if replacement fails
    """
    # Normalize all inputs
    search_text = normalize_line_endings(search_text)
    replace_text = normalize_line_endings(replace_text)
    content = normalize_line_endings(content)
    
    # Add newlines if missing
    if search_text and not search_text.endswith('\n'):
        search_text += '\n'
    if replace_text and not replace_text.endswith('\n'):
        replace_text += '\n'
    if content and not content.endswith('\n'):
        content += '\n'
    
    # Try direct replacement first (most reliable)
    if search_text in content:
        return content.replace(search_text, replace_text)
    
    # If that doesn't work, try matching with flexible whitespace
    try:
        # Create a pattern that's more flexible with whitespace
        # but preserves the core content
        pattern = search_text.strip()
        pattern = re.escape(pattern)
        # Make whitespace flexible
        pattern = pattern.replace(r'\ ', r'\s+')
        
        # Use regex to find and replace
        result = re.sub(pattern, replace_text.strip(), content, count=1)
        if result != content:
            return result
    except Exception:
        pass
        
    # If no methods worked, return None
    return None
