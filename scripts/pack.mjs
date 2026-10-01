import { cp, mkdir } from 'node:fs/promises';

await mkdir('github-upload', { recursive: true });
for (const name of ['index.html', 'src', 'vendor', 'favicon.svg', '.nojekyll']) {
  await cp(name, `github-upload/${name}`, { recursive: true });
}
console.log('github-upload 폴더 안의 내용을 저장소 루트에 업로드하세요.');
