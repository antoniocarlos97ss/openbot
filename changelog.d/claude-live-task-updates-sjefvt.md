### Added

- An agent can show short progress updates in the chat while it works on a long task: what it will
  do, a finding that changes the work, a blocker, or a change of direction. When you redirect an
  agent during its work, it answers your message at once and continues the task. Turn it on in
  Server settings > General, "Progress updates while agents work". The owner or an admin of a
  connected server, such as a headless server, can turn it on from their computer. It works with
  every provider.
- An agent can give a long task to a temporary background worker and stay free to talk with you.
  The worker uses the same provider and model, stays out of the sidebar unless it needs you (also
  on a connected server, such as a headless server), and is removed when it sends its result. Turn
  it on in Server settings > General, "Background workers".
