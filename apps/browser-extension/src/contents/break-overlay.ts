import { Storage } from '@plasmohq/storage';
import type { PlasmoCSConfig } from 'plasmo';
import type { PomodoroState } from '~pomodoro/types';
import { STORAGE_KEY } from '~pomodoro/types';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_start',
};

let prevOverflow = '';
let prevUserSelect = '';
const blockers: Array<{ type: string; handler: EventListener }> = [];
const storage = new Storage({ area: 'local' });

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'pomodoro-break-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
  overlay.style.zIndex = '2147483647';
  overlay.style.display = 'none';
  overlay.style.pointerEvents = 'auto';
  overlay.style.cursor = 'not-allowed';
  overlay.style.backdropFilter = 'blur(1px)';
  overlay.tabIndex = -1;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '休息时间，请离开屏幕放松一下');
  overlay.innerHTML = `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:22px;text-align:center;line-height:1.7;">
      ☕ 休息时间，请离开屏幕放松一下...
    </div>`;
  document.documentElement.appendChild(overlay);
  return overlay;
}

const overlay = createOverlay();

function preventAll(e: Event) {
  e.preventDefault();
  e.stopImmediatePropagation();
}

function enableBlock() {
  // 记录并禁用滚动与选中
  prevOverflow = document.documentElement.style.overflow;
  prevUserSelect = (document.documentElement.style as CSSStyleDeclaration)
    .userSelect;
  document.documentElement.style.overflow = 'hidden';
  (document.documentElement.style as CSSStyleDeclaration).userSelect = 'none';

  const types = [
    'click',
    'mousedown',
    'mouseup',
    'mousemove',
    'dblclick',
    'contextmenu',
    'wheel',
    'scroll',
    'touchstart',
    'touchmove',
    'keydown',
    'keypress',
    'keyup',
  ];

  for (const t of types) {
    const handler = preventAll as EventListener;
    window.addEventListener(t, handler, { capture: true, passive: false });
    blockers.push({ type: t, handler });
  }

  // 让遮罩获得焦点，尽量拦截键盘
  overlay.focus();
}

function disableBlock() {
  document.documentElement.style.overflow = prevOverflow;
  (document.documentElement.style as CSSStyleDeclaration).userSelect =
    prevUserSelect;

  for (const { type, handler } of blockers) {
    window.removeEventListener(type, handler, {
      capture: true,
    } as AddEventListenerOptions);
  }

  blockers.length = 0;
}

function setOverlayVisible(v: boolean) {
  overlay.style.display = v ? 'block' : 'none';

  if (v) {
    enableBlock();
  } else {
    disableBlock();
  }
}

function isBreakPhase(phase?: string) {
  return phase === 'short' || phase === 'long';
}

// 初始检查
storage
  .get<PomodoroState>(STORAGE_KEY)
  .then((state) => {
    setOverlayVisible(isBreakPhase(state?.phase));
  })
  .catch(() => {
    // 忽略错误
  });

// 订阅变化
storage.watch({
  [STORAGE_KEY]: (change) => {
    const newState = change.newValue as PomodoroState;
    setOverlayVisible(isBreakPhase(newState?.phase));
  },
});
