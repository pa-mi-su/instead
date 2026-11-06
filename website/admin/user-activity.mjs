// Explicitly scoped admin restoration. Never render user-supplied HTML.
export function restorationPlan(user, exclusion) {
  const contributorScope = exclusion.scope === 'contributor';
  return {
    label: contributorScope
      ? 'Restore contributor & their recipes'
      : 'Restore recipe for this account',
    message: contributorScope
      ? `Restore ${
          exclusion.contributor
            ? '@' + exclusion.contributor
            : 'this contributor'
        } and all their recipes for ${user.email}? This affects ${
          exclusion.affected_recipes
        } recorded recipe(s), including other guides. Reports stay on file. Archived or removed content stays unavailable. Other accounts are unchanged. Removed bookmarks are not recreated.`
      : `Restore “${exclusion.title}” for ${user.email} only? Its report stays on file. Archived or removed content stays unavailable. Other accounts are unchanged. Removed bookmarks are not recreated.`,
    payload: {
      p_user: user.user_id,
      p_email: user.email,
      p_scope: contributorScope ? 'contributor' : 'recipe',
      p_product: contributorScope ? null : exclusion.product_id,
      p_recipe: contributorScope ? null : exclusion.recipe_id,
      p_contributor: contributorScope ? exclusion.contributor_id : null,
    },
  };
}
const sections = [
  ['overview', 'Overview'],
  ['recipes', 'Recipes'],
  ['votes', 'Votes'],
  ['reports', 'Reports'],
  ['exclusions', 'Hidden recipes'],
  ['saves', 'Saved'],
  ['comments', 'Comments'],
  ['terms', 'Terms'],
  ['audit', 'Admin actions'],
];
const statsLabels = {
  recipes: 'Submitted recipes',
  published_recipes: 'Published',
  pending_recipes: 'Pending',
  votes: 'Current votes',
  upvotes: 'Upvotes',
  downvotes: 'Downvotes',
  reports: 'Recipe reports',
  open_reports: 'Open reports',
  hidden_recipes: 'Hidden recipes',
  contributor_exclusions: 'Excluded contributors',
  saved_guides: 'Saved guides',
  saved_recipes: 'Saved recipes',
  comments: 'Comments',
};
export function mountUserActivity(
  root,
  user,
  { element, button, request, token, isCurrent, dialog, onUpdated = () => {} },
) {
  let section = 'overview';
  let offset = 0;
  let generation = 0;
  const date = value =>
    value ? new Date(value).toLocaleString() : 'Not recorded';
  const text = (parent, label, value) => {
    const entry = element('div', undefined, 'user-fact');
    entry.append(element('dt', label), element('dd', value ?? 'Not provided'));
    parent.append(entry);
  };
  async function load(nextSection = section, nextOffset = offset) {
    if (!isCurrent()) return;
    const current = ++generation;
    const feedback = element('p', 'Loading account activity…', 'meta');
    feedback.setAttribute('role', 'status');
    root.append(feedback);
    try {
      const data = await request(
        '/rest/v1/rpc/community_admin_user_activity',
        { p_user: user.user_id, p_section: nextSection, p_offset: nextOffset },
        await token(),
      );
      if (current !== generation || !isCurrent()) return;
      if (data.total && nextOffset >= data.total) return load(nextSection, 0);
      section = nextSection;
      offset = nextOffset;
      render(data);
      onUpdated(data);
    } catch (error) {
      if (isCurrent() && current === generation) throw error;
    } finally {
      feedback.remove();
    }
  }
  async function restore(data, item) {
    const plan = restorationPlan(data.user, item);
    const note = await dialog({
      title: 'Restore personal recipe visibility',
      message: plan.message,
      confirm: 'Restore for this account',
      cancel: true,
      reason: true,
      reasonMaxLength: 1000,
    });
    if (!note || !isCurrent()) return;
    try {
      const result = await request(
        '/rest/v1/rpc/community_admin_restore_exclusion',
        { ...plan.payload, p_note: note },
        await token(),
      );
      if (!isCurrent()) return;
      await load('exclusions', 0);
      if (!isCurrent()) return;
      await dialog({
        title: 'Personal visibility updated',
        message: result.restored
          ? `Restored visibility for ${result.affected_recipes} recipe(s) for ${data.user.email}. Ask the user to reopen the app. Reports and global publication are unchanged; bookmarks were not recreated.`
          : 'No matching exclusion remained. The view has been refreshed.',
      });
    } catch (error) {
      if (isCurrent()) throw error;
    }
  }
  function render(data) {
    root.replaceChildren();
    const header = element('div', undefined, 'user-activity-header');
    header.append(element('h3', 'Account details & activity'));
    header.append(
      button('Close details', () => {
        generation++;
        root.replaceChildren(
          button('View account details & activity', () => load()),
        );
      }),
    );
    root.append(header);
    const navigation = element('nav', undefined, 'user-activity-nav');
    navigation.setAttribute('aria-label', 'User activity sections');
    for (const [key, label] of sections) {
      const control = button(label, () => load(key, 0));
      control.setAttribute('aria-pressed', String(section === key));
      navigation.append(control);
    }
    root.append(navigation);
    if (section === 'overview') {
      const facts = element('dl', undefined, 'user-facts');
      for (const [label, value] of [
        ['Email', data.user.email],
        ['Account ID', data.user.user_id],
        ['Public username', data.user.username],
        ['Bio', data.user.bio],
        ['Created', date(data.user.created_at)],
        ['Last sign-in', date(data.user.last_sign_in_at)],
        ['Email verified', date(data.user.email_confirmed_at)],
        ['Role', data.user.is_admin ? 'Admin' : 'User'],
        ['Suspended', data.user.suspended ? 'Yes' : 'No'],
        ['Banned until', date(data.user.banned_until)],
        ['Deletion requested', date(data.user.deletion_requested_at)],
        ['Avatar path', data.user.avatar_path],
      ])
        text(facts, label, value);
      root.append(facts);
      const grid = element('div', undefined, 'user-stats');
      for (const [key, label] of Object.entries(statsLabels)) {
        const stat = element('div', undefined, 'user-stat');
        stat.append(
          element('strong', String(data.stats[key] ?? 0)),
          element('span', label),
        );
        grid.append(stat);
      }
      root.append(grid);
      root.append(
        element(
          'p',
          'Counts describe currently stored account activity. Removed votes are not retained as a lifetime vote history.',
          'meta',
        ),
      );
      return;
    }
    if (section === 'exclusions')
      root.append(
        element(
          'p',
          'Reporting a community recipe also excludes its contributor. A contributor restore covers every recipe by that contributor for this account. It never republishes content or clears a report.',
          'notice',
        ),
      );
    if (section === 'votes')
      root.append(
        element(
          'p',
          'Current votes only; vote timestamps and removed votes are not stored.',
          'meta',
        ),
      );
    const list = element('div', undefined, 'user-activity-list');
    for (const item of data.items) {
      const entry = element('article', undefined, 'user-activity-entry');
      entry.append(element('h4', item.title || item.recipe_id || item.id));
      const metadata = [
        item.product_id,
        item.kind,
        item.status,
        item.reason,
        item.created_at ? date(item.created_at) : null,
      ];
      entry.append(element('p', metadata.filter(Boolean).join(' · '), 'meta'));
      if (item.value !== undefined)
        entry.append(element('p', item.value === 1 ? 'Upvote' : 'Downvote'));
      if (item.details)
        entry.append(element('p', item.details, 'user-concern-text'));
      if (item.note || item.moderation_note)
        entry.append(
          element('p', item.note || item.moderation_note, 'user-concern-text'),
        );
      if (section === 'reports')
        entry.append(
          element(
            'p',
            `${
              item.reviewed_at
                ? 'Reviewed ' + date(item.reviewed_at)
                : 'Awaiting review'
            } · ${
              item.emailed_at
                ? 'Email accepted ' + date(item.emailed_at)
                : 'Email not yet confirmed'
            }`,
            'meta',
          ),
        );
      if (section === 'exclusions') {
        entry.append(
          element(
            'p',
            item.scope === 'contributor'
              ? `Contributor-wide exclusion: ${
                  item.contributor
                    ? '@' + item.contributor
                    : 'account unavailable'
                } · ${item.affected_recipes} recipe(s)`
              : 'Direct recipe exclusion',
            'user-scope',
          ),
        );
        if (!item.published)
          entry.append(
            element(
              'p',
              'Not currently published. A personal restore will not publish it.',
              'meta',
            ),
          );
        const plan = restorationPlan(data.user, item);
        const control = button(plan.label, () => restore(data, item));
        control.disabled = Boolean(data.user.deletion_requested_at);
        entry.append(control);
      }
      list.append(entry);
    }
    if (!data.items.length)
      list.append(element('p', 'No records in this section.', 'meta'));
    root.append(list);
    const pages = element('div', undefined, 'actions user-activity-pagination');
    const previous = button('Previous 20', () =>
      load(section, Math.max(0, offset - 20)),
    );
    previous.disabled = offset === 0;
    const next = button('Next 20', () => load(section, offset + 20));
    next.disabled = offset + data.items.length >= data.total;
    pages.append(
      previous,
      element(
        'span',
        data.total
          ? `${offset + 1}–${offset + data.items.length} of ${data.total}`
          : '0 records',
        'meta',
      ),
      next,
      button('Refresh', () => load(section, offset)),
    );
    root.append(pages);
  }
  root.append(button('View account details & activity', () => load()));
}
