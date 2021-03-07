function now() {
    let d = new Date();
    return `${d.getFullYear()}-${f(d.getMonth()+1)}-${f(d.getDate())} ${f(d.getHours())}:${f(d.getMinutes())}:${f(d.getSeconds())}`;
    function f(n) {
        return (n+"").padStart(2, '0');
    }
}

module.exports = { now };