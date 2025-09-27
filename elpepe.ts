const response = await fetch('http://localhost:3009/api/fortnite-shop/update', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        message: 'Hello, world!'
    })
});
const data = await response.json();
console.log(data);