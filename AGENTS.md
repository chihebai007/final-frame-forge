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

- Store fixed public-page photo settings as `image_` keys in `site_texts`, separate from text editing, so existing admin permissions and public reads remain authoritative.
- Validate public image sources through `public/image-url.js`, allowing raster data URLs from the shared admin picker but rejecting executable sources.
