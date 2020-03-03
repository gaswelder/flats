export const formatDateTime = (date) =>
  formatDate(date) + " " + formatTime(date);

export const formatTime = (date) =>
  [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
  ].join(":");

export const formatDate = (date) => {
  return [
    date.getDate().toString().padStart(2, "0"),
    (date.getMonth() + 1).toString().padStart(2, "0"),
  ].join(".");
};
