<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Orders arrive from the separate store site via POST /api/public/pedidos (validated, status forced to pendente); the panel reads/updates the `pedidos` table only for signed-in users. Why: the store is a different project and cannot share browser storage.
- Never create auth users by inserting into `auth.users` directly; GoTrue sign-in on such rows fails with 500 "Database error querying schema". Create accounts through the auth `/auth/v1/signup` endpoint with the publishable key instead, then mark `email_confirmed_at = now()` via SQL when instant sign-in is needed.
