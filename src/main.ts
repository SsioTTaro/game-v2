import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('app root element (#app) was not found');
}

app.innerHTML = `
  <main class="title-stub">
    <h1>ぷかるんゲーム</h1>
    <p>Sprint 1: 動く土台</p>
  </main>
`;
