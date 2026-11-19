import './app/editor';
import { bindShell } from './app/commands';
import { openPalette } from './app/bindings';
import './app/gestures';
import './app/comments';
import './app/labels';
import './app/cards';
import './app/cutout';
import './app/cloud';
import { bindDocks, showPanel, toggleDock } from './ui/dock';
import { AgentPanel } from './ui/panels/agent';
import { S, drawCamera, onState, selection, toast } from './app/editor';
import { restore } from './app/tabs';
import { mountDock, registerTerminal } from './app/terminal';
import { attachCatalogue } from './app/catalogue';
import { registerIllustrator } from './app/illustrator';
import { bindLanguage } from './app/language';
import { registerVisibility } from './app/visibility';
import { registerBlend } from './app/blend';
import { registerVideo } from './app/video';
import './app/drag-out';
import { registerPdf } from './app/pdf';
import { registerCropMode } from './app/crop-mode';
import { registerTransformTools } from './app/transform-tools';
import { registerLasso } from './app/lasso';
import { registerGroupNormalize } from './app/group-normalize';
import { registerDropInto } from './app/drop-into';
import { registerCardFit } from './app/card-fit';
import { registerWindowLayout } from './app/window-layout';
import { registerStudy } from './app/study';
import { registerAdjust } from './app/adjust';
import { registerBoardExtract } from './app/board-extract';
import { registerMeasure } from './app/measure';
import { registerCompare } from './app/compare';
import { registerPractice } from './app/practice';
import { registerPictureInfo } from './app/picture-info';
import { registerRating } from './app/rating';
import { registerConnectSelection } from './app/connect-selection';
import { registerConnectionStyle } from './app/connection-style';
import { registerColorFind } from './app/color-find';
import { registerSimilarFind } from './app/similar-find';
import { registerSavedSearch } from './app/saved-search';
import { registerTagCloud } from './app/tag-cloud';
import { registerTagSuggest } from './app/tag-suggest';
import { registerHome } from './app/home';
import { bindMenus } from './app/menus';
import { revealWhenReady } from './ui/reveal';

bindLanguage();
registerTerminal();
registerIllustrator();
registerVisibility();
registerBlend();
registerVideo();
registerPdf();
registerCropMode();
registerTransformTools();
registerLasso();
registerGroupNormalize();
registerDropInto();
registerCardFit();
registerWindowLayout();
registerStudy();
registerAdjust();
registerBoardExtract();
registerMeasure();
registerCompare();
registerPractice();
registerPictureInfo();
registerRating();
registerConnectSelection();
registerConnectionStyle();
registerColorFind();
registerSimilarFind();
registerTagCloud();
registerTagSuggest();
registerSavedSearch();
registerHome();
bindMenus();
attachCatalogue();

const agent = new AgentPanel({
  boardId: () => S.state?.board.id || null,
  selection: () => [...selection],
  afterTurn: () => undefined,
  notify: toast,
});

function panel(name: string) {
  showPanel(name);
  if (name === 'agent') agent.focus();
}

bindShell({ palette: openPalette, dock: side => toggleDock(side, drawCamera), panel });
bindDocks(drawCamera);
document.querySelectorAll<HTMLElement>('[data-panel-tab="agent"],[data-rail-panel="agent"]').forEach(node => node.addEventListener('click', () => agent.focus()));
if (document.documentElement.dataset.rightPanel === 'agent') void agent.load();
onState(() => agent.refresh());

mountDock();
drawCamera();
revealWhenReady(restore());
