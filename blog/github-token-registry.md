#### Why your `docker login ghcr.io` keeps failing and why AI gets it wrong

---

Every few weeks, I see the same advice floating around, from AI assistants, Stack Overflow snippets, or auto-generated DevOps docs:

> Just log in with your GitHub Personal Access Token (PAT):
> `echo $TOKEN | docker login ghcr.io -u USERNAME --password-stdin`

Looks fine, right?
Except it usually **doesn't work**.

When you try to pull or push an image from GitHub's Container Registry (GHCR), you might run into mysterious authentication errors. The reason isn't Docker, nor GitHub's fault, it's the **missing scope**.

---

### **The Problem**

Most generic AI answers and many tutorials forget that GitHub's Personal Access Tokens (PATs) are scoped.
By default, a token with only `repo` permissions won't be able to interact with packages, including your container images.

That means this will fail silently or return a `401 Unauthorized` when you try:

```bash
docker pull ghcr.io/hemp0r/those-containerz:latest
```

AI models tend to memorize documentation patterns, not permission hierarchies.
The official GitHub Docs *mention* scopes, but examples are simplified for readability.
So AI often parrots the snippet, not the nuance.
And in security-sensitive systems like container registries, that missing nuance breaks automation.

---

### **The Real Fix**

You need to manually create a Personal Access Token (classic) or a fine-grained token that explicitly includes:

* `read:packages` → required for pulling images
* `write:packages` → required for pushing images

Then, log in like this:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u your-github-username --password-stdin
```

Now it works.
Simple, explicit, and CI/CD-friendly.

---

### **Best Practice for CI/CD**

In GitHub Actions or other CI/CD systems:

1. **Create a dedicated automation token** (not your personal one).
2. **Grant only `read:packages` or `write:packages`** depending on what you need.
3. **Store it securely** as a secret (e.g., `GHCR_TOKEN`).
4. Use it during your workflow:

   ```bash
   echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u your-username --password-stdin
   ```

This avoids permission errors, keeps your pipeline clean, and doesn't rely on undocumented defaults.

---

### **Final Thought**

When AI says, *“Just use your GitHub token,”* always ask: *which scopes?*
Because DevOps isn't magic, it's access control with better UX.
