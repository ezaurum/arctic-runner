// ── Types ──
interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface BalanceData {
  penguin: Record<string, number>;
  camera: Record<string, number>;
  obstacles: Record<string, Record<string, number | boolean | string>>;
  items: Record<string, Record<string, number>>;
  scoring: Record<string, number>;
  rendering: Record<string, number | string>;
}

interface StageData {
  stages: Stage[];
}

interface Stage {
  id: number;
  name: string;
  distance: number;
  timeLimit: number;
  roadCurve: { at: number; curveX: number }[];
  roadElevation: { at: number; y: number }[];
  obstacles: Record<string, { frequency: number; startAfter?: number }>;
  collectibles: Record<string, { frequency: number; startAfter?: number }>;
  environment: Record<string, number>;
}

// ── Slider definitions ──
const penguinSliders: SliderDef[] = [
  { key: 'baseSpeed', label: '기본 속도', min: 5, max: 50, step: 1 },
  { key: 'maxSpeed', label: '최대 속도', min: 20, max: 100, step: 1 },
  { key: 'acceleration', label: '가속도', min: 1, max: 20, step: 0.5 },
  { key: 'lateralSpeed', label: '좌우 속도', min: 5, max: 30, step: 1 },
  { key: 'jumpForce', label: '점프력', min: 3, max: 20, step: 0.5 },
  { key: 'gravity', label: '중력', min: 10, max: 60, step: 1 },
];

const cameraSliders: SliderDef[] = [
  { key: 'offsetY', label: '카메라 높이', min: 1, max: 15, step: 0.5 },
  { key: 'offsetZ', label: '카메라 거리', min: 3, max: 20, step: 0.5 },
  { key: 'lookAheadZ', label: '전방 주시 거리', min: 5, max: 30, step: 1 },
  { key: 'smoothing', label: '추적 부드러움', min: 0.01, max: 0.5, step: 0.01 },
];

// ── State ──
let balanceData: BalanceData;
let stagesData: StageData;
let activePreviewTab: 'balance' | 'stages' = 'balance';

// ── DOM helpers ──
const $ = (sel: string) => document.querySelector(sel)!;
const controlsEl = $('#controls') as HTMLDivElement;
const previewEl = $('#preview') as HTMLTextAreaElement;
const gameFrame = $('#game-frame') as HTMLIFrameElement;

function createSection(title: string, id: string): { section: HTMLDivElement; body: HTMLDivElement } {
  const section = document.createElement('div');
  section.className = 'section';
  section.id = id;

  const titleEl = document.createElement('div');
  titleEl.className = 'section-title';
  titleEl.textContent = title;
  titleEl.addEventListener('click', () => section.classList.toggle('collapsed'));

  const body = document.createElement('div');
  body.className = 'section-body';

  section.append(titleEl, body);
  return { section, body };
}

function createSlider(
  def: SliderDef,
  currentValue: number,
  onChange: (val: number) => void,
): HTMLDivElement {
  const field = document.createElement('div');
  field.className = 'field';

  const label = document.createElement('label');
  const nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.textContent = `${def.label} (${def.key})`;
  const valueSpan = document.createElement('span');
  valueSpan.className = 'value';
  valueSpan.textContent = String(currentValue);

  label.append(nameSpan, valueSpan);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(def.min);
  input.max = String(def.max);
  input.step = String(def.step);
  input.value = String(currentValue);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valueSpan.textContent = String(v);
    onChange(v);
    updatePreview();
  });

  field.append(label, input);
  return field;
}

function createNumberInput(
  label: string,
  currentValue: number,
  onChange: (val: number) => void,
): HTMLDivElement {
  const field = document.createElement('div');
  field.className = 'field';

  const lbl = document.createElement('label');
  const nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.textContent = label;
  const valueSpan = document.createElement('span');
  valueSpan.className = 'value';
  valueSpan.textContent = '';
  lbl.append(nameSpan, valueSpan);

  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(currentValue);
  input.step = 'any';
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    if (!isNaN(v)) {
      onChange(v);
      updatePreview();
    }
  });

  field.append(lbl, input);
  return field;
}

function createDropdown(
  label: string,
  options: string[],
  currentValue: string,
  onChange: (val: string) => void,
): HTMLDivElement {
  const field = document.createElement('div');
  field.className = 'field';

  const lbl = document.createElement('label');
  const nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.textContent = label;
  lbl.appendChild(nameSpan);

  const select = document.createElement('select');
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === currentValue) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener('change', () => {
    onChange(select.value);
    updatePreview();
  });

  field.append(lbl, select);
  return field;
}

function createColorInput(
  label: string,
  currentValue: string,
  onChange: (val: string) => void,
): HTMLDivElement {
  const field = document.createElement('div');
  field.className = 'field';

  const lbl = document.createElement('label');
  const nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.textContent = label;
  lbl.appendChild(nameSpan);

  const input = document.createElement('input');
  input.type = 'color';
  input.value = currentValue;
  input.style.width = '60px';
  input.style.height = '28px';
  input.style.border = 'none';
  input.style.cursor = 'pointer';
  input.addEventListener('input', () => {
    onChange(input.value);
    updatePreview();
  });

  field.append(lbl, input);
  return field;
}

// ── Build UI ──
function buildPenguinSection() {
  const { section, body } = createSection('Penguin', 'sec-penguin');
  for (const def of penguinSliders) {
    const val = balanceData.penguin[def.key] as number;
    body.appendChild(
      createSlider(def, val, (v) => {
        balanceData.penguin[def.key] = v;
      }),
    );
  }
  controlsEl.appendChild(section);
}

function buildCameraSection() {
  const { section, body } = createSection('Camera', 'sec-camera');
  for (const def of cameraSliders) {
    const val = balanceData.camera[def.key] as number;
    body.appendChild(
      createSlider(def, val, (v) => {
        balanceData.camera[def.key] = v;
      }),
    );
  }
  controlsEl.appendChild(section);
}

function buildObstaclesSection() {
  const { section, body } = createSection('Obstacles', 'sec-obstacles');
  for (const [type, data] of Object.entries(balanceData.obstacles)) {
    const sub = document.createElement('div');
    sub.style.marginBottom = '10px';
    const heading = document.createElement('div');
    heading.style.fontWeight = 'bold';
    heading.style.color = '#53d8fb';
    heading.style.marginBottom = '4px';
    heading.textContent = type;
    sub.appendChild(heading);

    if (typeof data.speedPenalty === 'number') {
      sub.appendChild(
        createSlider(
          { key: 'speedPenalty', label: '속도 패널티', min: 0, max: 1, step: 0.05 },
          data.speedPenalty,
          (v) => { (balanceData.obstacles[type] as Record<string, number | boolean>).speedPenalty = v; },
        ),
      );
    }
    if (typeof data.stunDuration === 'number') {
      sub.appendChild(
        createSlider(
          { key: 'stunDuration', label: '스턴 시간', min: 0, max: 5, step: 0.1 },
          data.stunDuration,
          (v) => { (balanceData.obstacles[type] as Record<string, number | boolean>).stunDuration = v; },
        ),
      );
    }

    // hitBehavior dropdown
    if (typeof data.hitBehavior === 'string') {
      sub.appendChild(
        createDropdown(
          '충돌 동작 (hitBehavior)',
          ['slide', 'trap', 'kill'],
          data.hitBehavior as string,
          (v) => { (balanceData.obstacles[type] as Record<string, number | boolean | string>).hitBehavior = v; },
        ),
      );
    }

    body.appendChild(sub);
  }
  controlsEl.appendChild(section);
}

function buildStagesSection() {
  const { section, body } = createSection('Stages', 'sec-stages');

  // Stage selector
  const selField = document.createElement('div');
  selField.className = 'field';
  const sel = document.createElement('select');
  sel.id = 'stage-select';
  for (const stage of stagesData.stages) {
    const opt = document.createElement('option');
    opt.value = String(stage.id);
    opt.textContent = `${stage.id}. ${stage.name}`;
    sel.appendChild(opt);
  }
  selField.appendChild(sel);
  body.appendChild(selField);

  const stageDetail = document.createElement('div');
  stageDetail.id = 'stage-detail';
  body.appendChild(stageDetail);

  sel.addEventListener('change', () => renderStageDetail(parseInt(sel.value)));
  renderStageDetail(stagesData.stages[0].id);

  function renderStageDetail(stageId: number) {
    const stage = stagesData.stages.find((s) => s.id === stageId)!;
    stageDetail.innerHTML = '';

    stageDetail.appendChild(
      createNumberInput('distance (거리)', stage.distance, (v) => { stage.distance = v; }),
    );
    stageDetail.appendChild(
      createNumberInput('timeLimit (제한시간)', stage.timeLimit, (v) => { stage.timeLimit = v; }),
    );

    // Obstacles frequency
    const obsHeading = document.createElement('div');
    obsHeading.style.fontWeight = 'bold';
    obsHeading.style.color = '#53d8fb';
    obsHeading.style.margin = '8px 0 4px';
    obsHeading.textContent = '장애물 빈도';
    stageDetail.appendChild(obsHeading);

    for (const [type, cfg] of Object.entries(stage.obstacles)) {
      stageDetail.appendChild(
        createNumberInput(`${type} frequency`, cfg.frequency, (v) => { cfg.frequency = v; }),
      );
    }

    // Collectibles frequency
    const colHeading = document.createElement('div');
    colHeading.style.fontWeight = 'bold';
    colHeading.style.color = '#53d8fb';
    colHeading.style.margin = '8px 0 4px';
    colHeading.textContent = '아이템 빈도';
    stageDetail.appendChild(colHeading);

    for (const [type, cfg] of Object.entries(stage.collectibles)) {
      stageDetail.appendChild(
        createNumberInput(`${type} frequency`, cfg.frequency, (v) => { cfg.frequency = v; }),
      );
    }

    // Environment
    const envHeading = document.createElement('div');
    envHeading.style.fontWeight = 'bold';
    envHeading.style.color = '#53d8fb';
    envHeading.style.margin = '8px 0 4px';
    envHeading.textContent = '환경';
    stageDetail.appendChild(envHeading);

    stageDetail.appendChild(
      createSlider(
        { key: 'fogNear', label: '안개 시작', min: 10, max: 200, step: 5 },
        stage.environment.fogNear,
        (v) => { stage.environment.fogNear = v; },
      ),
    );
    stageDetail.appendChild(
      createSlider(
        { key: 'fogFar', label: '안개 끝', min: 100, max: 600, step: 10 },
        stage.environment.fogFar,
        (v) => { stage.environment.fogFar = v; },
      ),
    );
    stageDetail.appendChild(
      createSlider(
        { key: 'snowIntensity', label: '눈 강도', min: 0, max: 2, step: 0.1 },
        stage.environment.snowIntensity,
        (v) => { stage.environment.snowIntensity = v; },
      ),
    );
  }

  controlsEl.appendChild(section);
}

function buildRenderingSection() {
  const { section, body } = createSection('Rendering', 'sec-rendering');
  const r = balanceData.rendering;

  body.appendChild(createSlider(
    { key: 'ambientIntensity', label: '앰비언트 강도', min: 0, max: 5, step: 0.1 },
    r.ambientIntensity as number,
    (v) => { r.ambientIntensity = v; },
  ));
  body.appendChild(createSlider(
    { key: 'dirLightIntensity', label: '직사광 강도', min: 0, max: 5, step: 0.1 },
    r.dirLightIntensity as number,
    (v) => { r.dirLightIntensity = v; },
  ));
  body.appendChild(createColorInput('도로 색상 (roadColor)', r.roadColor as string,
    (v) => { r.roadColor = v; },
  ));
  body.appendChild(createSlider(
    { key: 'roadRoughness', label: '도로 roughness', min: 0, max: 1, step: 0.01 },
    r.roadRoughness as number,
    (v) => { r.roadRoughness = v; },
  ));
  body.appendChild(createSlider(
    { key: 'roadMetalness', label: '도로 metalness', min: 0, max: 1, step: 0.01 },
    r.roadMetalness as number,
    (v) => { r.roadMetalness = v; },
  ));
  body.appendChild(createColorInput('설원 색상 (groundColor)', r.groundColor as string,
    (v) => { r.groundColor = v; },
  ));
  body.appendChild(createSlider(
    { key: 'groundRoughness', label: '설원 roughness', min: 0, max: 1, step: 0.01 },
    r.groundRoughness as number,
    (v) => { r.groundRoughness = v; },
  ));
  body.appendChild(createSlider(
    { key: 'groundMetalness', label: '설원 metalness', min: 0, max: 1, step: 0.01 },
    r.groundMetalness as number,
    (v) => { r.groundMetalness = v; },
  ));

  controlsEl.appendChild(section);
}

// ── Persistence ──
const LS_BALANCE_KEY = 'tuning-balance';
const LS_STAGES_KEY = 'tuning-stages';

function saveToLocalStorage() {
  localStorage.setItem(LS_BALANCE_KEY, JSON.stringify(balanceData));
  localStorage.setItem(LS_STAGES_KEY, JSON.stringify(stagesData));
}

// ── Preview ──
function updatePreview() {
  const data = activePreviewTab === 'balance' ? balanceData : stagesData;
  previewEl.value = JSON.stringify(data, null, 2);

  // Persist
  saveToLocalStorage();

  // Live-push to game iframe
  gameFrame.contentWindow?.postMessage({
    type: 'tuning-update',
    balance: balanceData,
  }, '*');
}

// ── Download helper ──
function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Init ──
async function init() {
  const [balanceRes, stagesRes] = await Promise.all([
    fetch('./data/balance.json'),
    fetch('./data/stages.json'),
  ]);
  const defaultBalance = await balanceRes.json();
  const defaultStages = await stagesRes.json();

  // Restore from localStorage if available
  const savedBalance = localStorage.getItem(LS_BALANCE_KEY);
  const savedStages = localStorage.getItem(LS_STAGES_KEY);
  balanceData = savedBalance ? JSON.parse(savedBalance) : defaultBalance;
  stagesData = savedStages ? JSON.parse(savedStages) : defaultStages;

  buildPenguinSection();
  buildCameraSection();
  buildRenderingSection();
  buildObstaclesSection();
  buildStagesSection();
  updatePreview();

  // Tab switching
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activePreviewTab = (tab as HTMLElement).dataset.tab as 'balance' | 'stages';
      updatePreview();
    });
  });

  // Buttons
  $('#btn-copy').addEventListener('click', () => {
    const data = activePreviewTab === 'balance' ? balanceData : stagesData;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  });

  $('#btn-dl-balance').addEventListener('click', () => downloadJson(balanceData, 'balance.json'));
  $('#btn-dl-stages').addEventListener('click', () => downloadJson(stagesData, 'stages.json'));

  $('#btn-reload').addEventListener('click', () => {
    gameFrame.src = gameFrame.src;
  });

  $('#btn-reset').addEventListener('click', () => {
    localStorage.removeItem(LS_BALANCE_KEY);
    localStorage.removeItem(LS_STAGES_KEY);
    location.reload();
  });
}

init();
