import { initUI } from './ui.js';
import { registerQuizPlayHandlers } from './quiz-play.js';
import { registerStatsHandlers, openStats } from './stats.js';
import { registerAdminHandlers, openBuilder } from './admin.js';

registerQuizPlayHandlers();
registerStatsHandlers();
registerAdminHandlers();

initUI({
  onStats: openStats,
  onBuilder: openBuilder,
});
