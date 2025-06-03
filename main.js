document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('menu').classList.toggle('hidden');
});

fetch('menu.json')
  .then(response => response.json())
  .then(items => {
    const menu = document.getElementById('menu');
    items.forEach(item => {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.name;
      a.target = 'mainFrame';
      menu.appendChild(a);
    });
  });
