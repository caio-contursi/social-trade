const state = {
  token: localStorage.getItem('socialtrade_token'),
  user: JSON.parse(localStorage.getItem('socialtrade_user') || 'null'),
  catalog: null,
  projects: [],
  loginType: 'project',
  registrationMode: 'institution',
  page: 'home',
  carouselIndex: 0,
  carouselTimer: null,
};

const states = [
  ['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']
];

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function toast(message, isError=false) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.toggle('error', isError);
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 3200);
}

async function api(path, options={}) {
  const headers = {'Content-Type':'application/json', ...(options.headers || {})};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, {...options, headers});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && state.token) logout(false);
    const detail = data.detail;
    const message = Array.isArray(detail) ? detail.map(item => item.msg).join(' ') : (detail || 'Não foi possível concluir a solicitação.');
    throw new Error(message);
  }
  return data;
}

function switchAuth(showRegister) {
  $('#login-form').classList.toggle('hidden', showRegister);
  $('#register-form').classList.toggle('hidden', !showRegister);
  if (showRegister) setRegistrationMode(state.registrationMode);
  if (showRegister) window.scrollTo({top:0,behavior:'smooth'});
}

function fillSignupCatalog() {
  const typeSelect = $('[name="organization_type"]');
  state.catalog.organization_types.forEach(item => typeSelect.add(new Option(item.label, item.code)));
  const stateSelect = $('[name="institution_state"]');
  states.forEach(([code,label]) => stateSelect.add(new Option(`${label} (${code})`, code)));
  $('#area-options').innerHTML = state.catalog.areas.map(item => `<label class="choice-option"><input type="checkbox" name="areas" value="${escapeHtml(item.code)}"><span>${escapeHtml(item.label)}</span></label>`).join('');
  api('/api/projects/open').then(projects => {
    state.projects = projects;
    const select = $('[name="member_project_id"]');
    select.innerHTML = '<option value="">Ainda não vincular a um projeto</option>' + projects.map(project => '<option value="' + project.id + '">' + escapeHtml(project.name) + ' · ' + escapeHtml(project.city) + '/' + escapeHtml(project.state) + '</option>').join('');
  }).catch(() => {});
}

function setRegistrationMode(mode) {
  state.registrationMode = mode;
  const personMode = mode === 'person';
  $$('.register-mode').forEach(button => button.classList.toggle('active', button.dataset.registrationMode === mode));
  $('#person-fields').classList.toggle('hidden', !personMode);
  $('#institution-fields').classList.toggle('hidden', personMode);
  $$('input,select,textarea', $('#person-fields')).forEach(field => { field.disabled = !personMode; field.required = personMode && ['person_full_name','person_document','person_email','person_password','person_password_confirmation'].includes(field.name); });
  $$('input,select,textarea', $('#institution-fields')).forEach(field => {
    field.disabled = personMode;
    field.required = !personMode && ['institution_name','institution_kind','institution_document','institution_email','institution_contact','institution_password','institution_password_confirmation'].includes(field.name);
  });
  syncInstitutionKind();
}

function syncInstitutionKind() {
  const kind = $('[name="institution_kind"]')?.value || 'project';
  const isProject = kind === 'project';
  $$('.project-only').forEach(wrapper => {
    wrapper.classList.toggle('hidden', !isProject);
    $$('input,select,textarea', wrapper).forEach(field => {
      field.disabled = state.registrationMode !== 'institution' || !isProject;
      field.required = state.registrationMode === 'institution' && isProject && ['organization_type','institution_city','institution_state','institution_summary','institution_objective','institution_impact'].includes(field.name);
    });
  });
}

function normalizeDocument(raw) {
  const trimmed = raw.trim();
  if (/[^\x00-\x7F]/.test(trimmed)) return trimmed;
  const value = trimmed.toUpperCase();
  const cpfMask = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
  const cnpjMask = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/.test(value);
  return cpfMask || cnpjMask ? value.replace(/[.\-/]/g, '') : value;
}

function apiDate(raw) {
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(raw) ? raw : raw + 'Z');
}

function validateCnpj(raw) {
  const document = normalizeDocument(raw);
  if (!document) return true;
  if (!/^[A-Z0-9]{12}\d{2}$/.test(document) || /^(\d)\1+$/.test(document)) return false;
  for (const weights of [[5,4,3,2,9,8,7,6,5,4,3,2], [6,5,4,3,2,9,8,7,6,5,4,3,2]]) {
    const total = weights.reduce((sum, weight, index) => sum + (document.charCodeAt(index) - 48) * weight, 0);
    const remainder = total % 11;
    if ((remainder < 2 ? 0 : 11 - remainder) !== Number(document[weights.length])) return false;
  }
  return true;
}

function validateCpf(raw) {
  const digits = normalizeDocument(raw);
  if (!/^\d{11}$/.test(digits) || /^([0-9])\1+$/.test(digits)) return false;
  for (const length of [9,10]) {
    const total = [...digits.slice(0,length)].reduce((sum,char,index)=>sum+Number(char)*(length+1-index),0);
    let check = (total*10)%11;
    if (check===10) check=0;
    if (check!==Number(digits[length])) return false;
  }
  return true;
}

function setupRegistrationForm() {
  const form = $('#register-form');
  $$('[data-registration-mode]').forEach(button => button.addEventListener('click', () => setRegistrationMode(button.dataset.registrationMode)));
  $('[name="institution_kind"]').addEventListener('change', syncInstitutionKind);
  const personPassword = $('[name="person_password"]');
  const personConfirmation = $('[name="person_password_confirmation"]');
  const institutionPassword = $('[name="institution_password"]');
  const institutionConfirmation = $('[name="institution_password_confirmation"]');
  [[personPassword,personConfirmation],[institutionPassword,institutionConfirmation]].forEach(([password,confirmation]) => {
    const validate = () => confirmation.setCustomValidity(confirmation.value && confirmation.value !== password.value ? 'As senhas não coincidem.' : '');
    password.addEventListener('input', validate);
    confirmation.addEventListener('input', validate);
  });
  const institutionDocument = $('[name="institution_document"]');
  institutionDocument.addEventListener('blur', () => {
    const valid = validateCnpj(institutionDocument.value);
    institutionDocument.setCustomValidity(valid ? '' : 'CNPJ inválido. Confira os 14 caracteres.');
    if (!valid) institutionDocument.reportValidity();
  });
  const personDocument = $('[name="person_document"]');
  personDocument.addEventListener('blur', () => {
    if (!personDocument.value) return;
    const valid = validateCpf(personDocument.value);
    personDocument.setCustomValidity(valid ? '' : 'CPF inválido. Confira os 11 dígitos.');
    if (!valid) personDocument.reportValidity();
  });
  setRegistrationMode('institution');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const mode = state.registrationMode;
    const kind = values.institution_kind;
    const areas = $$('#area-options input:checked').map(input => input.value);
    $('#areas-error').textContent = mode === 'institution' && kind === 'project' && !areas.length ? 'Selecione ao menos uma área de atuação.' : '';
    if (mode === 'institution' && kind === 'project' && !areas.length) return;
    const documentInput = mode === 'person' ? personDocument : institutionDocument;
    const validDocument = mode === 'person' ? validateCpf(documentInput.value) : validateCnpj(documentInput.value);
    documentInput.setCustomValidity(validDocument ? '' : (mode === 'person' ? 'CPF inválido.' : 'CNPJ inválido.'));
    if (!form.reportValidity()) return;
    let endpoint, body;
    if (mode === 'person') {
      const document = normalizeDocument(values.person_document);
      endpoint = '/api/auth/register';
      body = {
        full_name: values.person_full_name.trim(), username: document, email: values.person_email.trim(), document,
        password: values.person_password, password_confirmation: values.person_password_confirmation,
        phone: values.person_phone || null, responsible_title: 'Usuário', role: 'member',
        member_project_id: values.member_project_id ? Number(values.member_project_id) : null,
        member_role: values.member_role || null,
      };
      if (body.member_project_id && !body.member_role) { toast('Selecione se o usuário será funcionário ou assistido.', true); return; }
    } else {
      const document = normalizeDocument(values.institution_document);
      const isProject = kind === 'project';
      endpoint = '/api/auth/register-institution';
      body = {
        full_name: values.institution_contact.trim(), document, email: values.institution_email.trim(),
        password: values.institution_password, password_confirmation: values.institution_password_confirmation,
        phone: values.institution_phone || null, institution_kind: kind,
        organization: {
          name: values.institution_name.trim(), organization_type: isProject ? values.organization_type : 'association',
          institution_kind: kind, cnpj: document, city: isProject ? values.institution_city.trim() : 'N/A',
          state: isProject ? values.institution_state : 'SP',
          founding_year: isProject && values.institution_founding_year ? Number(values.institution_founding_year) : null,
          short_description: isProject ? values.institution_summary.trim() : 'Empresa doadora cadastrada para conectar recursos a projetos sociais.',
          objective: isProject ? values.institution_objective || null : null,
          impact_summary: isProject ? values.institution_impact || null : null,
          description: isProject ? values.institution_description || null : 'Empresa doadora na rede SocialTrade.',
          website_url: isProject ? values.institution_website || null : null,
          instagram_url: isProject ? values.institution_instagram || null : null,
          pix_key: null, logo_url: null, areas: isProject ? areas : [], interested_services: [],
        },
      };
    }
    const submit = $('button[type="submit"]', form);
    submit.disabled = true; submit.textContent = 'Criando seu cadastro…';
    try {
      const result = await api(endpoint, {method:'POST', body:JSON.stringify(body)});
      form.reset();
      setRegistrationMode('institution');
      switchAuth(false);
      if (mode === 'person') toast('Cadastro concluído. Sua matrícula SocialTrade é ' + result.registration_number + '. Anote esse número.');
      else toast(result.message || 'Cadastro concluído. Entre para continuar.');
    } catch (error) { toast(error.message, true); }
    finally { submit.disabled = false; submit.innerHTML = 'Criar cadastro <span>→</span>'; }
  });
}

async function login(document, password, accountType) {
  const number = normalizeDocument(document);
  if (!/^(?:[0-9]{11}|[A-Z0-9]{12}[0-9]{2})$/.test(number)) throw new Error('Informe um CPF ou CNPJ válido.');
  const result = await api('/api/auth/login', {method:'POST', body:JSON.stringify({document:number,password,account_type:accountType})});
  state.token = result.access_token; state.user = result.user;
  localStorage.setItem('socialtrade_token', state.token);
  localStorage.setItem('socialtrade_user', JSON.stringify(state.user));
  showApp();
  openPage('home');
}

function showApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  $('#header-name').textContent = state.user.full_name;
  $('#header-role').textContent = state.user.account_type === 'donor' ? 'Empresa doadora' : state.user.account_type === 'project' ? 'Projeto social' : state.user.role_label;
  $('#header-avatar').textContent = (state.user.full_name || 'U').trim().charAt(0).toUpperCase();
  $('#moderation-nav').classList.toggle('hidden', state.user.role !== 'moderator');
  $('#donor-projects-nav').classList.toggle('hidden', state.user.account_type !== 'donor');
}

function logout(showToast=true) {
  state.token = null; state.user = null;
  localStorage.removeItem('socialtrade_token'); localStorage.removeItem('socialtrade_user');
  clearInterval(state.carouselTimer);
  $('#app-shell').classList.add('hidden'); $('#auth-screen').classList.remove('hidden');
  $('#sidebar').classList.remove('open');
  if (showToast) toast('Você saiu da sua conta.');
}

function openPage(page) {
  if (page === 'moderation' && state.user?.role !== 'moderator') { toast('Acesso restrito à moderação.', true); return; }
  if (page === 'projects' && state.user?.account_type !== 'donor') { toast('Esta área é exclusiva de empresas doadoras.', true); return; }
  state.page = page;
  $('#sidebar').classList.remove('open');
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  const labels = {home:'Menu principal',organizations:'Organização',projects:'Projetos para apoiar',announcements:'Avisos',profile:'Meu perfil',support:'Suporte',moderation:'Painel de moderação'};
  $('#current-page-name').textContent = labels[page] || labels.home;
  clearInterval(state.carouselTimer);
  const renderers = {home:renderHome,organizations:renderOrganizations,projects:renderProjects,announcements:renderAnnouncements,profile:renderProfile,support:renderSupport,moderation:renderModeration};
  (renderers[page] || renderHome)();
}

function heading(kicker,title,subtitle,button='') {
  return `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(kicker)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>${button}</div>`;
}

function renderHome() {
  if (state.user.account_type === 'donor') return renderDonorHome();
  const page = $('#page-content');
  const today = new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  page.innerHTML = `<div class="welcome-row"><div><span class="eyebrow">PAINEL</span><h1>Olá, ${escapeHtml(state.user.full_name.split(' ')[0])} <span aria-hidden="true">✳</span></h1><p>Resumo da sua conta e das organizações cadastradas.</p></div><span class="welcome-date">${escapeHtml(today)}</span></div>
    <div class="dashboard-grid"><section class="carousel" aria-label="Carrossel de frutas e alimentação consciente">
      <article class="carousel-slide active" data-kind="apple"><div class="carousel-copy"><span class="eyebrow">GALERIA</span><h2>Maçã</h2><p>Imagem da fruta selecionada.</p></div><img src="/assets/fruit-apple.svg" alt="Ilustração de uma maçã vermelha"></article>
      <article class="carousel-slide" data-kind="banana"><div class="carousel-copy"><span class="eyebrow">GALERIA</span><h2>Banana</h2><p>Imagem da fruta selecionada.</p></div><img src="/assets/fruit-banana.svg" alt="Ilustração de uma banana amarela"></article>
      <article class="carousel-slide" data-kind="orange"><div class="carousel-copy"><span class="eyebrow">GALERIA</span><h2>Laranja</h2><p>Imagem da fruta selecionada.</p></div><img src="/assets/fruit-orange.svg" alt="Ilustração de uma laranja"></article>
      <div class="carousel-controls" aria-label="Selecionar imagem do carrossel"><button class="carousel-dot active" data-slide="0" aria-label="Maçã"></button><button class="carousel-dot" data-slide="1" aria-label="Banana"></button><button class="carousel-dot" data-slide="2" aria-label="Laranja"></button><span class="carousel-label" id="carousel-label">1 / 3</span></div>
    </section><aside class="welcome-card"><span class="small-icon">✿</span><h3>Organizações</h3><p>Consulte e atualize os dados das iniciativas cadastradas na sua conta.</p><button class="button button-soft" data-page="organizations">Ver organização <span>→</span></button></aside></div>
    <div class="stats-row"><article class="stat-card"><span class="stat-icon">◫</span><div><strong id="stat-orgs">—</strong><span>organizações</span></div></article><article class="stat-card"><span class="stat-icon">◉</span><div><strong id="stat-notices">—</strong><span>avisos publicados</span></div></article><article class="stat-card"><span class="stat-icon">♡</span><div><strong>Aberto</strong><span>canal de suporte</span></div></article></div>
    <div class="home-lower"><section class="section-card panel-card"><div class="section-card-head"><h3>Próximos passos</h3><button class="inline-link" data-page="organizations">Ver organização →</button></div><div class="steps-list"><article class="step-item"><span class="step-num">1</span><div><strong>Conte sua história</strong><p>Complete o perfil institucional.</p></div></article><article class="step-item"><span class="step-num">2</span><div><strong>Escolha suas causas</strong><p>Mostre onde atua.</p></div></article><article class="step-item"><span class="step-num">3</span><div><strong>Fique por dentro</strong><p>Acompanhe os avisos.</p></div></article></div></section><section class="section-card panel-card"><div class="section-card-head"><h3>Últimos avisos</h3><button class="inline-link" data-page="announcements">Ver todos →</button></div><div id="home-notices" class="loading">Carregando avisos…</div></section></div>`;
  const slides = $$('.carousel-slide', page); const dots = $$('.carousel-dot', page);
  const goTo = index => {
    state.carouselIndex = (index + slides.length) % slides.length;
    slides.forEach((slide,i) => slide.classList.toggle('active', i === state.carouselIndex));
    dots.forEach((dot,i) => dot.classList.toggle('active', i === state.carouselIndex));
    $('#carousel-label').textContent = `${state.carouselIndex + 1} / ${slides.length}`;
  };
  dots.forEach(dot => dot.addEventListener('click', () => { goTo(Number(dot.dataset.slide)); clearInterval(state.carouselTimer); state.carouselTimer=setInterval(()=>goTo(state.carouselIndex+1),5000); }));
  state.carouselTimer = setInterval(() => goTo(state.carouselIndex + 1), 5000);
  Promise.all([api('/api/organizations/mine'),api('/api/announcements')]).then(([orgs,notices]) => {
    $('#stat-orgs').textContent = orgs.length;
    $('#stat-notices').textContent = notices.length;
    $('#home-notices').innerHTML = notices.slice(0,2).map(notice => `<article class="latest-notice"><span class="notice-bullet">✳</span><div><strong>${escapeHtml(notice.title)}</strong><p>${escapeHtml(notice.body)}</p></div></article>`).join('') || '<span class="service-note">Ainda não há avisos.</span>';
  }).catch(error => toast(error.message,true));
}

function renderDonorHome() {
  $('#page-content').innerHTML = heading('REDE DE IMPACTO','Projetos para apoiar','Conheça objetivos e resultados informados por projetos sociais cadastrados.') + '<div id="donor-project-list" class="content-grid"><div class="loading">Carregando projetos sociais…</div></div>';
  loadDonorProjects();
}

function projectCard(project) {
  const areas = (project.areas || []).map(code => '<span class="tag">' + escapeHtml(areaLabel(code)) + '</span>').join('');
  return '<article class="org-card project-impact-card"><div class="org-card-head"><span class="org-logo">' + escapeHtml(project.name.slice(0,1).toUpperCase()) + '</span><div><h3>' + escapeHtml(project.name) + '</h3><div class="org-sub">' + escapeHtml(project.city) + ' · ' + escapeHtml(project.state) + '</div></div><span class="status-pill">Projeto social</span></div><p>' + escapeHtml(project.short_description) + '</p><section class="project-impact-section"><strong>Objetivos</strong><p>' + escapeHtml(project.objective || project.description || 'Objetivos ainda não informados.') + '</p></section><section class="project-impact-section"><strong>Impacto e resultados</strong><p>' + escapeHtml(project.impact_summary || 'Resultados ainda não informados.') + '</p></section><div class="tag-list">' + areas + '</div><a class="button button-soft org-public-link" target="_blank" rel="noopener" href="/public?slug=' + encodeURIComponent(project.slug) + '">Ver perfil do projeto ↗</a></article>';
}

function loadDonorProjects() {
  api('/api/projects').then(projects => {
    const target = $('#donor-project-list');
    if (!target) return;
    target.innerHTML = projects.map(projectCard).join('') || '<section class="empty-state"><h2>Nenhum projeto disponível ainda</h2><p>Quando projetos sociais se cadastrarem, seus objetivos e impactos aparecerão aqui.</p></section>';
  }).catch(error => { const target = $('#donor-project-list'); if (target) target.textContent = error.message; });
}

function renderProjects() {
  $('#page-content').innerHTML = heading('REDE DE IMPACTO','Projetos para apoiar','Compare objetivos, áreas de atuação e resultados informados pelos projetos sociais.') + '<div id="donor-project-list" class="content-grid"><div class="loading">Carregando projetos sociais…</div></div>';
  loadDonorProjects();
}

function areaLabel(code) { return state.catalog.areas.find(item => item.code === code)?.label || code; }
function formAreaChoices(selected=[]) { return `<div class="choice-grid">${state.catalog.areas.map(item=>`<label class="choice-option"><input type="checkbox" name="areas" value="${escapeHtml(item.code)}" ${selected.includes(item.code)?'checked':''}><span>${escapeHtml(item.label)}</span></label>`).join('')}</div>`; }

function orgFormMarkup() {
  return `<form id="org-create-form" class="org-form-wrap"><h2>Adicionar organização</h2><div class="org-form-grid">
    <label class="span-2">Nome da organização<input name="name" minlength="2" maxlength="160" required></label>
    <label>Tipo<select name="organization_type" required><option value="">Selecione</option>${state.catalog.organization_types.map(item=>`<option value="${item.code}">${escapeHtml(item.label)}</option>`).join('')}</select></label>
    <label>CNPJ <small>opcional</small><input name="cnpj" maxlength="18" placeholder="00.000.000/0000-00"></label>
    <label>Cidade<input name="city" minlength="2" required></label><label>Estado<select name="state" required><option value="">Selecione</option>${states.map(([code,label])=>`<option value="${code}">${label} (${code})</option>`).join('')}</select></label>
    <label>Ano de início <small>opcional</small><input name="founding_year" type="number" min="1800" max="2100"></label>
    <label class="span-2">Descrição curta<textarea name="short_description" minlength="10" maxlength="280" required></textarea></label>
    <label class="span-2">Descrição completa <small>opcional</small><textarea name="description" maxlength="5000"></textarea></label>
    <label>Site <small>opcional</small><input name="website_url" type="url" placeholder="https://"></label><label>Instagram <small>opcional</small><input name="instagram_url" type="url" placeholder="https://"></label>
    <label>Chave Pix <small>opcional</small><input name="pix_key" maxlength="160"></label><label>Link do logo <small>opcional</small><input name="logo_url" type="url" placeholder="https://"></label>
  </div><div class="choice-section"><span class="choice-title">Áreas de atuação</span>${formAreaChoices()}<span class="field-error" id="org-areas-error"></span></div>
  <div class="choice-section"><span class="choice-title">Serviços de interesse</span>${state.catalog.services.map(item=>`<label class="choice-option"><input type="checkbox" name="interested_services" value="${item.code}"><span>${escapeHtml(item.label)}</span></label>`).join('')}</div>
  <p class="status-note">Você poderá completar e atualizar as informações do seu perfil posteriormente.</p><button class="button button-primary" type="submit">Salvar organização <span>→</span></button></form>`;
}

function renderOrganizations() {
  if (state.user.account_type === 'donor') return renderProjects();
  if (state.user.account_type === 'person') {
    $('#page-content').innerHTML = heading('SEUS VÍNCULOS','Projetos sociais','Consulte os projetos aos quais você está vinculado como funcionário ou assistido.') + '<div id="organization-list" class="content-grid"><div class="loading">Carregando vínculos…</div></div>';
    api('/api/memberships/mine').then(items => {
      const target = $('#organization-list');
      target.innerHTML = items.map(item => '<article class="org-card"><div class="org-card-head"><span class="org-logo">' + escapeHtml(item.name.slice(0,1).toUpperCase()) + '</span><div><h3>' + escapeHtml(item.name) + '</h3><div class="org-sub">' + escapeHtml(item.city) + ' · ' + escapeHtml(item.state) + '</div></div></div><p>Seu vínculo: <strong>' + (item.member_role === 'staff' ? 'Funcionário' : 'Assistido') + '</strong></p></article>').join('') || '<section class="empty-state"><h2>Sem vínculos cadastrados</h2><p>Peça ao projeto social para vincular sua matrícula ou faça novo cadastro já selecionando um projeto.</p></section>';
    }).catch(error => { $('#organization-list').textContent = error.message; });
    return;
  }
  const page = $('#page-content');
  page.innerHTML = `${heading('PERFIL INSTITUCIONAL','Organização','Gerencie a identidade e as informações públicas do seu projeto.')}<div id="organization-list" class="loading">Carregando organizações…</div>`;
  api('/api/organizations/mine').then(orgs => {
    const target = $('#organization-list');
    if (!orgs.length) {
      target.innerHTML = `<section class="empty-state"><span class="empty-icon">◫</span><h2>Ainda não há uma organização cadastrada</h2><p>Adicione o perfil da sua iniciativa para apresentar sua história, localização e áreas de atuação.</p><button class="button button-primary" id="show-org-form">Adicionar organização <span>→</span></button><div id="org-form-slot"></div></section>`;
      $('#show-org-form').addEventListener('click', event => { event.currentTarget.classList.add('hidden'); $('#org-form-slot').innerHTML=orgFormMarkup(); bindOrgForm(); });
      return;
    }
    target.innerHTML = `<div class="content-grid">${orgs.map(org=>`<article class="org-card"><div class="org-card-head"><span class="org-logo">${escapeHtml(org.name.slice(0,1).toUpperCase())}</span><div><h3>${escapeHtml(org.name)}</h3><div class="org-sub">${escapeHtml(org.city)} · ${escapeHtml(org.state)} · ${escapeHtml(org.organization_type.replaceAll('_',' '))}</div></div><span class="status-pill">Perfil completo</span></div><p>${escapeHtml(org.short_description)}</p><div class="tag-list">${org.areas.map(code=>`<span class="tag">${escapeHtml(areaLabel(code))}</span>`).join('')}</div><div class="org-meta"><span>Entrou em ${apiDate(org.created_at).toLocaleDateString('pt-BR')}</span><span>${org.services.filter(item=>item.interested).length} serviços de interesse</span></div><a class="button button-soft org-public-link" target="_blank" rel="noopener" href="/public?slug=${encodeURIComponent(org.slug)}">Abrir página pública ↗</a></article>`).join('')}</div><div class="section-card panel-card" style="margin-top:15px;display:flex;justify-content:space-between;align-items:center;gap:15px"><div><h3>Tem mais de uma iniciativa?</h3><span class="service-note">Adicione outro perfil organizacional à sua conta.</span></div><button class="button button-soft" id="show-org-form">Adicionar organização</button></div><div id="org-form-slot"></div>`;
    $('#show-org-form').addEventListener('click', event=>{event.currentTarget.classList.add('hidden');$('#org-form-slot').innerHTML=orgFormMarkup();bindOrgForm();});
  }).catch(error => { $('#organization-list').textContent=error.message; });
}

function bindOrgForm() {
  const form=$('#org-create-form'); if(!form)return;
  const cnpj=$('[name="cnpj"]',form);
  cnpj.addEventListener('blur',()=>{const valid=validateCnpj(cnpj.value);cnpj.setCustomValidity(valid?'':'CNPJ inválido.');if(!valid)cnpj.reportValidity();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const areas=$$('input[name="areas"]:checked',form).map(input=>input.value);$('#org-areas-error').textContent=areas.length?'':'Selecione ao menos uma área.';
    cnpj.setCustomValidity(validateCnpj(cnpj.value)?'':'CNPJ inválido.');
    if(!areas.length||!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form).entries());
    const body={name:values.name.trim(),organization_type:values.organization_type,cnpj:normalizeDocument(values.cnpj)||null,city:values.city.trim(),state:values.state,founding_year:values.founding_year?Number(values.founding_year):null,short_description:values.short_description.trim(),description:values.description||null,website_url:values.website_url||null,instagram_url:values.instagram_url||null,pix_key:values.pix_key||null,logo_url:values.logo_url||null,areas,interested_services:$$('input[name="interested_services"]:checked',form).map(input=>input.value)};
    try{await api('/api/organizations',{method:'POST',body:JSON.stringify(body)});toast('Organização adicionada.');renderOrganizations();}catch(error){toast(error.message,true);}
  });
}

function renderAnnouncements() {
  const page=$('#page-content');page.innerHTML=`${heading('COMUNIDADE','Avisos','Novidades e orientações para acompanhar sua jornada.')}<div id="announcements-list" class="announcement-list"><div class="loading">Carregando avisos…</div></div>`;
  api('/api/announcements').then(items=>{$('#announcements-list').innerHTML=items.map(item=>`<article class="announcement-card"><span class="announcement-symbol">✳</span><div><span class="announcement-category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></div><time class="announcement-date">${apiDate(item.published_at).toLocaleDateString('pt-BR')}</time></article>`).join('')||'<section class="empty-state">Nenhum aviso publicado ainda.</section>';$('#notice-count').textContent=items.length;}).catch(error=>toast(error.message,true));
}

function renderProfile() {
  setTimeout(()=>{const label=$('#profile-form [name="username"]')?.closest('label');if(label)label.childNodes[0].textContent='Matrícula / CPF ou CNPJ';},0);
  const page=$('#page-content');page.innerHTML=`${heading('SUA CONTA','Meu perfil','Confira e atualize as informações da sua conta.')}<div class="profile-layout"><form id="profile-form" class="profile-form"><h2>Informações pessoais</h2><label>Usuário<input name="username" disabled></label><label>Nome completo<input name="full_name" required minlength="2" maxlength="120"></label><label>E-mail<input name="email" type="email" disabled></label><label>Telefone<input name="phone" type="tel" maxlength="30"></label><label class="span-2">Cargo / função<input name="responsible_title" maxlength="80"></label><button class="button button-primary" type="submit">Salvar alterações <span>→</span></button></form><aside class="profile-aside"><span class="profile-avatar-large" id="profile-avatar">U</span><h3 id="profile-name">Usuário</h3><p id="profile-email"></p><span class="profile-role" id="profile-role"></span><div style="margin-top:20px"><div class="profile-detail"><span>Conta criada</span><strong id="profile-created">—</strong></div><div class="profile-detail"><span>Tipo de acesso</span><strong id="profile-access">—</strong></div></div><p class="status-note">A função define quais áreas da plataforma ficam disponíveis para esta conta.</p></aside></div>`;
  api('/api/profile').then(user=>{const form=$('#profile-form');form.elements.username.value=user.registration_number||user.document||user.username;form.elements.full_name.value=user.full_name;form.elements.email.value=user.email;form.elements.phone.value=user.phone||'';form.elements.responsible_title.value=user.responsible_title||'';$('#profile-name').textContent=user.full_name;$('#profile-email').textContent=user.email;$('#profile-role').textContent=user.role_label;$('#profile-avatar').textContent=user.full_name.trim()[0].toUpperCase();$('#profile-created').textContent=apiDate(user.created_at).toLocaleDateString('pt-BR');$('#profile-access').textContent=user.account_type==='donor'?'Empresa doadora':user.account_type==='project'?'Projeto social':user.role_label;form.addEventListener('submit',async event=>{event.preventDefault();try{const result=await api('/api/profile',{method:'PATCH',body:JSON.stringify({full_name:form.elements.full_name.value,phone:form.elements.phone.value||null,responsible_title:form.elements.responsible_title.value||null})});state.user.full_name=form.elements.full_name.value;localStorage.setItem('socialtrade_user',JSON.stringify(state.user));$('#header-name').textContent=state.user.full_name;$('#header-avatar').textContent=state.user.full_name.trim()[0].toUpperCase();$('#profile-name').textContent=state.user.full_name;toast(result.message);}catch(error){toast(error.message,true);}});}).catch(error=>toast(error.message,true));
}

function ticketStatus(status){return {open:'Em aberto',in_progress:'Em andamento',resolved:'Resolvido'}[status]||status;}
function renderSupport() {
  $('#page-content').innerHTML=`${heading('ESTAMOS POR AQUI','Suporte','Conte o que aconteceu. Nossa equipe vai ajudar você.')}<div class="support-layout"><form id="support-form" class="support-form"><h2>Enviar uma solicitação</h2><label>Assunto<input name="subject" minlength="4" maxlength="140" placeholder="Ex.: Preciso atualizar meu cadastro" required></label><label>Como podemos ajudar?<textarea name="message" minlength="10" maxlength="4000" rows="6" placeholder="Descreva sua dúvida ou o que aconteceu…" required></textarea></label><button class="button button-primary" type="submit">Enviar para o suporte <span>→</span></button></form><section class="ticket-list"><h2>Minhas solicitações</h2><div id="my-tickets" class="loading">Carregando…</div></section></div>`;
  $('#support-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const body=Object.fromEntries(new FormData(form).entries());try{const result=await api('/api/support',{method:'POST',body:JSON.stringify(body)});form.reset();toast(result.message);renderSupport();}catch(error){toast(error.message,true);}});
  api('/api/support/mine').then(tickets=>$('#my-tickets').innerHTML=tickets.map(ticket=>`<article class="ticket-card"><div class="ticket-head"><h3>${escapeHtml(ticket.subject)}</h3><span class="ticket-status ${ticket.status}">${ticketStatus(ticket.status)}</span></div><p>${escapeHtml(ticket.message)}</p><span class="ticket-date">Protocolo #${escapeHtml(ticket.protocol)} · Enviada em ${apiDate(ticket.created_at).toLocaleDateString('pt-BR')}</span></article>`).join('')||'<span class="service-note">Você ainda não abriu solicitações.</span>').catch(error=>toast(error.message,true));
}

function renderModeration() {
  $('#page-content').innerHTML=`${heading('GESTÃO DA COMUNIDADE','Painel de moderação','Acompanhe solicitações e publique comunicados para a plataforma.')}<div class="loading" id="moderation-loading">Carregando painel…</div>`;
  api('/api/moderation/overview').then(data=>{
    $('#moderation-loading').outerHTML=`<div class="mod-stats"><article class="mod-stat"><span>Contas cadastradas</span><strong>${data.counts.users}</strong></article><article class="mod-stat"><span>Organizações</span><strong>${data.counts.organizations}</strong></article><article class="mod-stat"><span>Solicitações abertas</span><strong>${data.counts.open_tickets}</strong></article></div><div class="moderation-grid"><section class="moderation-panel"><h2>Solicitações de suporte</h2><div>${data.tickets.map(ticket=>`<article class="mod-ticket" data-ticket="${ticket.id}"><div class="mod-ticket-head"><strong>${escapeHtml(ticket.subject)}</strong><select aria-label="Status da solicitação"><option value="open" ${ticket.status==='open'?'selected':''}>Em aberto</option><option value="in_progress" ${ticket.status==='in_progress'?'selected':''}>Em andamento</option><option value="resolved" ${ticket.status==='resolved'?'selected':''}>Resolvido</option></select></div><p>${escapeHtml(ticket.message)}</p><small>Protocolo #${escapeHtml(ticket.protocol)} · ${escapeHtml(ticket.full_name)} · ${escapeHtml(ticket.email)} · ${apiDate(ticket.created_at).toLocaleDateString('pt-BR')}</small></article>`).join('')||'<p class="service-note">Nenhuma solicitação recebida.</p>'}</div></section><section class="moderation-panel"><h2>Comunicados</h2><form id="announcement-form" class="mod-form"><label>Título<input name="title" minlength="4" maxlength="160" required></label><label>Categoria<input name="category" maxlength="40" value="plataforma"></label><label>Mensagem<textarea name="body" minlength="10" maxlength="3000" rows="5" required></textarea></label><button class="button button-primary" type="submit">Publicar aviso <span>→</span></button></form></section></div>`;
    $$('.mod-ticket select').forEach(select=>select.addEventListener('change',async event=>{const card=event.currentTarget.closest('[data-ticket]');try{await api(`/api/moderation/tickets/${card.dataset.ticket}`,{method:'PATCH',body:JSON.stringify({status:event.currentTarget.value})});toast('Status atualizado.');}catch(error){toast(error.message,true);}}));
    $('#announcement-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{const result=await api('/api/moderation/announcements',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});form.reset();toast(result.message);}catch(error){toast(error.message,true);}});
  }).catch(error=>{$('#moderation-loading').textContent=error.message;});
}

function bindGlobalEvents() {
  $$('[data-show-register]').forEach(button=>button.addEventListener('click',()=>switchAuth(true)));
  $$('[data-show-login]').forEach(button=>button.addEventListener('click',()=>switchAuth(false)));
  $$('[data-account-type]').forEach(button=>button.addEventListener('click',()=>{state.loginType=button.dataset.accountType;$$('[data-account-type]').forEach(option=>option.classList.toggle('active',option===button));}));
  $$('[data-demo-document]').forEach(button=>button.addEventListener('click',()=>{state.loginType=button.dataset.demoType;$$('[data-account-type]').forEach(option=>option.classList.toggle('active',option.dataset.accountType===state.loginType));$('#login-document').value=button.dataset.demoDocument;$('#login-form [name="password"]').value='SocialTrade123!';}));
  $('#login-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const values=Object.fromEntries(new FormData(form).entries());const submit=$('button[type="submit"]',form);submit.disabled=true;try{await login(values.document,values.password,state.loginType);}catch(error){toast(error.message,true);}finally{submit.disabled=false;}});
  $('#logout-button').addEventListener('click',()=>logout());
  document.body.addEventListener('click',event=>{const target=event.target.closest('[data-page]');if(target){event.preventDefault();openPage(target.dataset.page);}});
  $('#mobile-menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
}

async function boot() {
  bindGlobalEvents();
  try { state.catalog=await api('/api/catalog');fillSignupCatalog();setupRegistrationForm(); }
  catch(error){toast(`Não foi possível carregar o formulário: ${error.message}`,true);}
  if(state.token&&state.user){
    try { state.user=await api('/api/auth/me');localStorage.setItem('socialtrade_user',JSON.stringify(state.user));showApp();openPage('home'); }
    catch { logout(false); }
  }
}

document.addEventListener('DOMContentLoaded',boot);
