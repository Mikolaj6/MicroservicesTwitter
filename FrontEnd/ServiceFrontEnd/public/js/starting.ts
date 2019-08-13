alert('HELLO')

let bla: HTMLElement = document.getElementById("bla");
let opis: HTMLElement = document.getElementById("ELO");

bla.onclick = async function() {
    await fetch('http://localhost:3000/bla').then(response => response.json()).catch(response => console.log("HTTP ERROR", response)).then(response => opis.innerHTML = response["bla"]);
}