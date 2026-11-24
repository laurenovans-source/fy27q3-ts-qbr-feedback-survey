const FOLDER_ID = '1BwWg0lpKpzUlCwg0bWnENhJJreL-adpL';
const RESPONSE_PREFIX = 'QBR response ';
const MIN_RESPONSES = 2;
const SESSION_IDS = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18'];
const AGREEMENT_IDS = ['alignedQ4', 'discussionTime', 'prereads'];
const COMMENT_IDS = ['mostValuable', 'leastValuable', 'q4Followups', 'nextTopics', 'other'];

function doGet(e) {
  if ((e.parameter.action || '') !== 'results') {
    return json({ ok: false, error: 'Unsupported action.' });
  }

  try {
    return json({ ok: true, summary: summarize(readLatestResponses()) });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function doPost(e) {
  try {
    const request = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (request.action === 'delete') return deleteResponse(request.id);
    if (request.action !== 'submit') return json({ ok: false, error: 'Unsupported action.' });
    if (!request.response || !isValidResponse(request.response)) {
      return json({ ok: false, error: 'Invalid survey response.' });
    }

    const response = request.response;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = RESPONSE_PREFIX + response.id + ' ' + timestamp + '.json';
    DriveApp.getFolderById(FOLDER_ID).createFile(name, JSON.stringify(response), MimeType.PLAIN_TEXT);
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function deleteResponse(id) {
  if (!/^r[a-z0-9]+$/i.test(String(id || ''))) {
    return json({ ok: false, error: 'Invalid response ID.' });
  }

  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  let deleted = 0;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().indexOf(RESPONSE_PREFIX + id + ' ') === 0) {
      file.setTrashed(true);
      deleted++;
    }
  }
  return json({ ok: true, deleted: deleted });
}

function isValidResponse(response) {
  return /^r[a-z0-9]+$/i.test(String(response.id || '')) &&
    typeof response.submittedAt === 'string' &&
    typeof response.ratings === 'object' &&
    typeof response.comments === 'object';
}

function readLatestResponses() {
  const latest = {};
  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().indexOf(RESPONSE_PREFIX) !== 0) continue;
    try {
      const response = JSON.parse(file.getBlob().getDataAsString());
      if (!isValidResponse(response)) continue;
      const existing = latest[response.id];
      if (!existing || file.getLastUpdated().getTime() > existing.updated) {
        latest[response.id] = { response: response, updated: file.getLastUpdated().getTime() };
      }
    } catch (error) {
      console.warn('Skipping invalid response file ' + file.getId());
    }
  }
  return Object.keys(latest).map(function (id) { return latest[id].response; });
}

function summarize(responses) {
  const summary = { count: responses.length, min_n: MIN_RESPONSES, fetched_at: new Date().toISOString() };
  if (responses.length < MIN_RESPONSES) return summary;

  summary.overall = score(responses.map(function (response) { return response.overall; }));
  summary.logistics = score(responses.map(function (response) { return response.logistics; }));
  summary.sessions = {};
  SESSION_IDS.forEach(function (id) {
    const ratings = [];
    let notAttended = 0;
    const comments = [];
    responses.forEach(function (response) {
      const rating = response.ratings[id];
      if (typeof rating === 'number') ratings.push(rating);
      if (rating === 'na') notAttended++;
      if (response.sessionComments[id]) comments.push(response.sessionComments[id]);
    });
    const session = score(ratings);
    session.na = notAttended;
    session.comments = comments;
    summary.sessions[id] = session;
  });

  summary.agree = {};
  AGREEMENT_IDS.forEach(function (id) {
    summary.agree[id] = score(responses.map(function (response) { return response.agree[id]; }));
  });
  summary.pacing = choices(responses, 'pacing');
  summary.mix = choices(responses, 'mix');
  summary.overall_comments = responses.map(function (response) { return response.overallComment; }).filter(Boolean);
  summary.comments = {};
  COMMENT_IDS.forEach(function (id) {
    summary.comments[id] = responses.map(function (response) { return response.comments[id]; }).filter(Boolean);
  });
  return summary;
}

function score(values) {
  const ratings = values.filter(function (value) { return typeof value === 'number' && value > 0; });
  if (ratings.length < MIN_RESPONSES) return { n: ratings.length, avg: null, top2: null };
  const average = ratings.reduce(function (total, value) { return total + value; }, 0) / ratings.length;
  return {
    n: ratings.length,
    avg: Math.round(average * 100) / 100,
    top2: Math.round(ratings.filter(function (value) { return value >= 4; }).length / ratings.length * 100) / 100
  };
}

function choices(responses, key) {
  const counts = {};
  let n = 0;
  responses.forEach(function (response) {
    if (response[key]) {
      counts[response[key]] = (counts[response[key]] || 0) + 1;
      n++;
    }
  });
  return { n: n, counts: n >= MIN_RESPONSES ? counts : null };
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
