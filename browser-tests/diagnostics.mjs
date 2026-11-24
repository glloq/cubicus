import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';

export async function captureFailure(browser, name) {
  const directory = process.env.CUBICUS_ARTIFACT_DIR;
  if (!directory) return;
  await mkdir(directory, {recursive: true});
  const pages = browser.contexts().flatMap(context => context.pages());
  await Promise.allSettled(pages.map((page, index) => page.screenshot({
    path: join(directory, name + '-' + index + '.png'),
    timeout: 5000
  })));
}
