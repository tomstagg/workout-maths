from app.routers.quiz import compute_scoring, points_for_table


def _answers(table: int, count: int, correct: bool) -> list[dict]:
    return [{"table_number": table, "is_correct": correct} for _ in range(count)]


def test_points_for_easy_tables():
    assert points_for_table(2) == 1
    assert points_for_table(5) == 1
    assert points_for_table(10) == 1


def test_points_for_medium_tables():
    assert points_for_table(3) == 2
    assert points_for_table(4) == 2
    assert points_for_table(6) == 2
    assert points_for_table(8) == 2
    assert points_for_table(9) == 2


def test_points_for_hard_tables():
    assert points_for_table(7) == 3
    assert points_for_table(11) == 3
    assert points_for_table(12) == 3


def test_all_correct_easy():
    answers = _answers(2, 10, True)
    base, streak_bonus, total, max_streak = compute_scoring(answers)
    assert base == 10
    assert streak_bonus == 40  # 5 + 10 + 25
    assert total == 50
    assert max_streak == 10


def test_all_wrong():
    answers = _answers(2, 10, False)
    base, streak_bonus, total, max_streak = compute_scoring(answers)
    assert base == 0
    assert streak_bonus == 0
    assert total == 0
    assert max_streak == 0


def test_streak_reset_milestones_clear():
    # 3-correct, 1-wrong, 3-correct: milestones clear on reset so 3-streak fires twice
    answers = _answers(2, 3, True) + _answers(2, 1, False) + _answers(2, 3, True)
    base, streak_bonus, total, max_streak = compute_scoring(answers)
    assert base == 6
    assert streak_bonus == 10  # +5 (first 3-streak) + +5 (second 3-streak after reset)
    assert total == 16
    assert max_streak == 3


def test_partial_streak_only_three_bonus():
    # 4 correct → 3-streak bonus fires, 5-streak bonus does not
    answers = _answers(2, 4, True)
    base, streak_bonus, total, max_streak = compute_scoring(answers)
    assert base == 4
    assert streak_bonus == 5  # only 3-streak, not 5-streak
    assert total == 9
    assert max_streak == 4


def test_alternating_correct_wrong_no_streak():
    # Alternating correct/wrong → max_streak=1, no bonuses
    answers = []
    for i in range(5):
        answers += _answers(2, 1, True) + _answers(2, 1, False)
    base, streak_bonus, total, max_streak = compute_scoring(answers)
    assert base == 5
    assert streak_bonus == 0
    assert max_streak == 1


def test_mixed_table_difficulties():
    # 5 easy (2×) + 5 hard (7×) all correct — base points use per-table rates
    answers = _answers(2, 5, True) + _answers(7, 5, True)
    base, streak_bonus, total, max_streak = compute_scoring(answers)
    assert base == 5 * 1 + 5 * 3  # 5 easy (1pt each) + 5 hard (3pts each)
    assert base == 20
    assert streak_bonus == 40  # 10 consecutive → all three bonuses (5+10+25)
    assert max_streak == 10
