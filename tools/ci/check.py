"""Dependency-free CI classification and repository documentation validation."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlencode
from urllib.request import Request, urlopen


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


def classify(changes):
    if not changes or any(status != 'M' and status != 'A' for status, _ in changes):
        return 'full'
    kinds = set()
    for _, path in changes:
        if path.endswith('.md') or (path.startswith('harness/') and path.endswith(('.json', '.jsonl'))):
            kinds.add('docs')
        elif path.startswith('backend/') and '.Tests/' not in path and not path.endswith(('packages.lock.json', '.csproj', '.props')):
            kinds.add('backend')
        elif path.startswith('frontend/src/') or path == 'frontend/index.html':
            kinds.add('frontend')
        else:
            return 'full'
    if 'backend' in kinds and 'frontend' in kinds:
        return 'full'
    return 'backend' if 'backend' in kinds else 'frontend' if 'frontend' in kinds else 'docs'


def revision_changes(base, head):
    try:
        if not re.fullmatch(r'[0-9a-f]{40}', base):
            return []
        git('cat-file', '-e', base + '^{commit}')
        raw = subprocess.check_output(['git', 'diff', '--name-status', '-z', '--no-renames', base, head]).decode()
        fields = raw.rstrip('\0').split('\0')
        return list(zip(fields[::2], fields[1::2])) if raw else []
    except subprocess.CalledProcessError:
        return []


def validate(root):
    files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
    # Include new helpers/docs during local precommit validation too.
    files += subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
    counts = {'json': 0, 'jsonl': 0, 'markdown': 0, 'targets': 0}
    for name in sorted(set(files) - {''}):
        path = root / name
        if not path.is_file():
            continue
        if path.suffix == '.json':
            json.loads(path.read_text()); counts['json'] += 1
        if path.suffix == '.jsonl':
            for line in path.read_text().splitlines():
                json.loads(line)
            counts['jsonl'] += 1
        if path.suffix == '.md':
            counts['markdown'] += 1
            content = re.sub(r'```.*?```', '', path.read_text(), flags=re.S)
            for target in re.findall(r'!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)', content):
                target = unquote(target.strip('<>').split('#')[0])
                if not target or re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:', target):
                    continue
                assert (path.parent / target).exists(), f'{name}: missing {target}'
                counts['targets'] += 1
    requirements = (root / 'docs/product/requirements.md').read_text()
    ids = re.findall(r'^\| (P\d{2})[ |]', requirements, re.M)
    assert len(ids) == 61 and set(ids) == {f'P{i:02}' for i in range(1, 62)}, '61 unique requirement rows required'
    subprocess.run(['git', 'diff', '--check'], cwd=root, check=True)
    print(json.dumps(counts), '61 requirement rows; whitespace passed')


def covered_push(prs, head):
    return any(pr.get('base', {}).get('ref') in ('develop', 'master') and pr.get('head', {}).get('sha') == head for pr in prs)


def overall(light, verify, mode):
    return light == 'success' and (verify == 'success' if mode not in ('docs', 'covered') else verify == 'skipped')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['classify', 'validate', 'result'])
    args = parser.parse_args()
    if args.command == 'validate':
        validate(Path.cwd())
    elif args.command == 'classify':
        mode = classify(revision_changes(os.environ.get('BASE_SHA', ''), os.environ.get('HEAD_SHA', 'HEAD')))
        # PR events still validate the merge revision. Suppress only redundant branch pushes.
        if os.environ.get('GITHUB_EVENT_NAME') == 'push':
            try:
                repo = os.environ['GITHUB_REPOSITORY']
                query = urlencode({'state': 'open', 'head': repo.split('/')[0] + ':' + os.environ['GITHUB_REF_NAME'], 'per_page': 100})
                request = Request(f'https://api.github.com/repos/{repo}/pulls?{query}', headers={'Accept': 'application/vnd.github+json'})
                with urlopen(request, timeout=10) as response:
                    if covered_push(json.load(response), os.environ.get('HEAD_SHA', '')):
                        mode = 'covered'
            except Exception:
                # API failure cannot turn verification off.
                print('PR duplicate detection unavailable; retaining conservative verification')
        print('Verification mode:', mode)
        with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
            output.write(f'mode={mode}\n')
    else:
        assert overall(os.environ['LIGHT_RESULT'], os.environ['VERIFY_RESULT'], os.environ['MODE']), 'CI prerequisite failed, cancelled or unexpectedly skipped'
