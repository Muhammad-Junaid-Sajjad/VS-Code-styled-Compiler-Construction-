import './main.css';
import { mountApp } from './App';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) mountApp(root);
