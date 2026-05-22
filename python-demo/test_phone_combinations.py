"""
pytest tests for letter_combinations (phone number letter combos).
These tests will FAIL with the buggy implementation.
"""
import pytest
from phone_combinations import letter_combinations


class TestLetterCombinations:

    def test_single_digit_2(self):
        """Digit '2' should map to ['a', 'b', 'c']"""
        result = sorted(letter_combinations("2"))
        assert result == ['a', 'b', 'c'], f"Expected ['a','b','c'] but got {result}"

    def test_single_digit_3(self):
        """Digit '3' should map to ['d', 'e', 'f']"""
        result = sorted(letter_combinations("3"))
        assert result == ['d', 'e', 'f'], f"Expected ['d','e','f'] but got {result}"

    def test_single_digit_7(self):
        """Digit '7' should map to ['p', 'q', 'r', 's'] (4 letters)"""
        result = sorted(letter_combinations("7"))
        assert result == ['p', 'q', 'r', 's'], f"Expected ['p','q','r','s'] but got {result}"

    def test_single_digit_9(self):
        """Digit '9' should map to ['w', 'x', 'y', 'z'] (4 letters)"""
        result = sorted(letter_combinations("9"))
        assert result == ['w', 'x', 'y', 'z'], f"Expected ['w','x','y','z'] but got {result}"

    def test_two_digits_23(self):
        """Digits '23' should produce all combinations of abc x def = 9 combos"""
        result = sorted(letter_combinations("23"))
        expected = sorted(["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"])
        assert result == expected, f"Expected {expected} but got {result}"

    def test_empty_string(self):
        """Empty input should return empty list"""
        assert letter_combinations("") == []

    def test_count_combinations(self):
        """'234' should have 3*3*3 = 27 combinations"""
        result = letter_combinations("234")
        assert len(result) == 27, f"Expected 27 combinations but got {len(result)}"

    def test_no_duplicates(self):
        """Result should not contain duplicate combinations"""
        result = letter_combinations("23")
        assert len(result) == len(set(result)), "Duplicate combinations found!"
