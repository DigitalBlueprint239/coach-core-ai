# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coaching.spec.ts >> P10 P11 P12 P17 offline draft, refresh, sign-out cancellation and second-account isolation
- Location: tests\coaching-ui\coaching.spec.ts:23:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByRole('status', { name: 'Practice save status' })
Expected: "saved"
Received: "failed"
Timeout:  10000ms

Call log:
  - Expect "toHaveText" getByRole('status', { name: 'Practice save status' }) with timeout 10000ms
  - waiting for getByRole('status', { name: 'Practice save status' })
    5 × locator resolved to <p role="status" aria-label="Practice save status">saving</p>
      - unexpected value "saving"
    2 × locator resolved to <p role="status" aria-label="Practice save status">failed</p>
      - unexpected value "failed"

```

```yaml
- status "Practice save status": failed
```

```
Tearing down "context" exceeded the test timeout of 60000ms.
```