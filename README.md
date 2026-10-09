# IEUM V2 공개 배포 자료

[IEUM V2 사이트](https://ieum-v2-react.vercel.app/#home)에서 2026년 10월 9일 내려받은 공개 배포 파일 보관본입니다.

## 저장된 자료

`ieum-v2-download/` 아래에 원본 경로와 내용을 보존했습니다. 원본 파일은 총 **46개**, **13,481,773바이트**입니다.

| 폴더 / 파일 | 내용 | 원본 파일 수 |
| --- | --- | ---: |
| `audio/` | 샘플 및 반주 MP3 | 6 |
| `demo-stems/` | 합성 시연 WAV 3개와 출처 목록 JSON | 4 |
| `figma/653-46/` | PNG 이미지 3개와 SVG 아이콘·그래픽 25개 | 28 |
| `assets/` | 배포 JavaScript, CSS, 폰트 4개 | 6 |
| `index.html`, `manifest.webmanifest` | 시작 페이지와 웹 앱 설정 | 2 |

화면에 포함된 인라인 그래픽과 프로젝트·곡 데이터는 원본 JavaScript/HTML에 들어 있습니다. 개발용 React TSX/JSX 원본, 저장소 이력, 서버 내부 파일, 사용자 브라우저의 개인 녹음은 이 보관본에 포함되지 않습니다. WAV 시연 파일은 사이트가 합성음으로 명시한 자료입니다.

## 검증 기록

- [파일별 출처·크기·SHA-256](ieum-v2-download/download-manifest.json)
- [다운로드 상세 안내](ieum-v2-download/다운로드-안내.txt)
- 46개 파일의 SHA-256, 이미지·음원·폰트 형식, SVG/XML 및 JSON을 확인했습니다.
- MP3 6개의 SHA-256은 배포 코드에 포함된 예상 해시와 일치합니다.
- `.gitattributes`가 다운로드 파일의 줄바꿈 변환을 막아 원본 바이트를 보존합니다.

## 로컬에서 보기

`ieum-v2-download` 폴더를 로컬 정적 웹 서버의 루트로 지정합니다. Python 3가 설치되어 있다면 다음 명령으로 열 수 있습니다.

```sh
python -m http.server 8000 --directory ieum-v2-download
```

이후 `http://localhost:8000/#home`에 접속합니다. `index.html`을 직접 더블클릭하면 루트 기준 자산 경로와 브라우저 기능 때문에 정상적으로 실행되지 않을 수 있습니다.

## 다운로드 스크립트

`download-ieum.ps1`은 원본 사이트에서 연결된 공개 파일을 수집합니다. 이미 저장된 파일은 유지하고, 누락된 파일을 다운로드하며 `download-manifest.json`을 기록합니다.

이 저장소에는 자동 배포 워크플로를 설정하지 않았습니다. Vercel 프로젝트 연결이나 배포는 수행하지 않았습니다.
