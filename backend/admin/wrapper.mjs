export const wrapper = (body) => {
  return `
<!DOCTYPE html>
<html>
<head>
<style>
label { display: block; margin-top: 1em; }
input {
    font-size: inherit; font: inherit; padding: 0.4em 0.4em;
    border-radius: 2px;
    border: thin solid gray;
}
button {
    font-size: inherit; font: inherit; padding: 0.4em 0.4em;
    min-width: 5em;
    margin-top: 1em;
}
table, td, th {
    border-style: solid;
    border-color: #999;
}
table {
    border-spacing: 0;
    border-width: 1px 1px 0;
}
td, th {
    padding: 0.5em;
    font-size: 90%;
    border-width: 0 0 1px;
}
</style>
<body>
${body}
</body>
</html>`;
};
