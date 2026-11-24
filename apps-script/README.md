# Google Apps Script backend

This script saves every response as a JSON file in the configured Google Drive folder and provides an anonymous aggregate summary for the survey's results page.

## Deploy

1. Open [script.new](https://script.new) while signed in with access to the responses folder.
2. Replace the default `Code.gs` content with `Code.gs` from this directory.
3. Select **Deploy** > **New deployment** > **Web app**.
4. Set **Execute as** to **Me**.
5. Set **Who has access** to the appropriate internal audience, such as everyone in your organization.
6. Authorize the deployment and copy the web-app URL ending in `/exec`.
7. In `index.html`, set `APP_SCRIPT_URL` to that URL, commit, and push the change.

Do not use the `/dev` URL. It works only for script editors; survey respondents need the deployed `/exec` URL.

## Behavior

- `POST` with `action: "submit"` saves a response file.
- `POST` with `action: "delete"` removes every version of the current browser's response ID.
- `GET ?action=results` returns only the aggregate results summary; individual response records are never sent to the browser.

The web app must be deployed with an access setting that allows the survey respondents to reach it. The app is intentionally restricted to the configured Drive folder and returns no names or email addresses.
