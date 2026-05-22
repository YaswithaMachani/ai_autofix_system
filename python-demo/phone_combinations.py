"""
Letter Combinations of a Phone Number
Given a string containing digits 2-9, return all possible letter
combinations the number could represent on a phone keypad.

Phone keypad:
  2 → abc   3 → def   4 → ghi
  5 → jkl   6 → mno   7 → pqrs
  8 → tuv   9 → wxyz
"""


def letter_combinations(digits: str):
    # BUG 1: Incomplete phone map — several keys are missing letters
    phone_map = {
        '2': 'ab',     # BUG: missing 'c'
        '3': 'df',     # BUG: missing 'e'
        '4': 'ghi',
        '5': 'jkl',
        '6': 'mn',     # BUG: missing 'o'
        '7': 'pqr',    # BUG: missing 's'
        '8': 'tuv',
        '9': 'wxy',    # BUG: missing 'z'
    }

    if not digits:
        return []

    result = []

    def backtrack(index, current):
        if index == len(digits):
            result.append(current)
            return
        # BUG 2: iterates over digits instead of phone_map letters
        for letter in digits[index]:
            backtrack(index + 1, current + letter)

    backtrack(0, "")
    return result
