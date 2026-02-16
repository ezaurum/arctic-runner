import { Game } from './Game';

const app = document.getElementById('app')!;
const game = new Game(app);
game.init().catch(console.error);
