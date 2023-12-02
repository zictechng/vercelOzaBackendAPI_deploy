exports.getBeginningOfTheWeek = (now) => {
    const days = (now.getDay() + 7 - 1) % 7;
    now.setDate(now.getDate() - days);
    now.setHours(0, 0, 0, 0);
    return now;
};