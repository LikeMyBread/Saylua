import random


def soulname(min_length=7):
    start = ""
    while len(start) < 3:
        start = random.choice(name_list)
    start = start[0:random.randint(2, len(start) - 1)]
    while len(start) < min_length:
        start = extend_name(start)
    return start.lower()

def extend_name(name):
    nextbit = ""
    name_end = name[len(name) - 1]
    while name_end not in nextbit:
        nextbit = random.choice(name_list)
    return name[:-1] + nextbit[nextbit.index(name_end):]