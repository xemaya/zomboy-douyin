// src/main.ts — 应用入口
import { boot } from './app';

boot().catch(e => console.error('boot failed', e));
