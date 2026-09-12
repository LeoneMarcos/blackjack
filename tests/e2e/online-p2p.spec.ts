import { expect, test } from '@playwright/test';

test.describe('Online P2P two-context browser flow', () => {
  test('connects Host and Guest via WebRTC DataChannel, handles ready, plays round, and rematches', async ({
    browser,
  }) => {
    const contextHost = await browser.newContext();
    const contextGuest = await browser.newContext();

    const pageHost = await contextHost.newPage();
    const pageGuest = await contextGuest.newPage();

    // Keep the host-owned shuffle deterministic so this flow always reaches
    // Player 1 -> Player 2 -> Dealer instead of occasionally ending on a natural.
    await pageHost.addInitScript(() => {
      Math.random = () => 0.1;
    });

    let hostWs: import('@playwright/test').WebSocketRoute | null = null;
    let guestWs: import('@playwright/test').WebSocketRoute | null = null;

    // Intercept WebSocket signaling on Host page
    await pageHost.routeWebSocket(/.*\/ws.*/, (ws) => {
      hostWs = ws;
      ws.onMessage((message) => {
        try {
          const parsed = JSON.parse(typeof message === 'string' ? message : message.toString());
          if (parsed.type === 'signal' && guestWs) {
            guestWs.send(JSON.stringify({ type: 'signal', data: parsed.data }));
          }
        } catch {
          // ignore
        }
      });

      // Assign host role
      ws.send(JSON.stringify({ type: 'assigned_role', role: 'host', roomId: 'P2P1' }));
    });

    // Intercept WebSocket signaling on Guest page
    await pageGuest.routeWebSocket(/.*\/ws.*/, (ws) => {
      guestWs = ws;
      ws.onMessage((message) => {
        try {
          const parsed = JSON.parse(typeof message === 'string' ? message : message.toString());
          if (parsed.type === 'signal' && hostWs) {
            hostWs.send(JSON.stringify({ type: 'signal', data: parsed.data }));
          }
        } catch {
          // ignore
        }
      });

      // Assign guest role
      ws.send(JSON.stringify({ type: 'assigned_role', role: 'guest', roomId: 'P2P1' }));

      // Notify both that peer joined to start WebRTC handshake
      hostWs?.send(JSON.stringify({ type: 'peer_joined', role: 'guest' }));
      ws.send(JSON.stringify({ type: 'peer_joined', role: 'host' }));
    });

    // 1. Host loads and switches to Online mode
    await pageHost.goto('/');
    const hostOnlineButton = pageHost.getByRole('button', { name: 'Online P2P', exact: true });
    await hostOnlineButton.click();
    await expect(pageHost.getByText('Online Multiplayer')).toBeVisible();

    // 2. Host creates a room
    await pageHost.getByRole('button', { name: 'Create Room', exact: true }).click();
    await expect(pageHost.getByText('Waiting for Player 2 to join...')).toBeVisible();

    // 3. Guest loads and joins the room
    await pageGuest.goto('/');
    const guestOnlineButton = pageGuest.getByRole('button', { name: 'Online P2P', exact: true });
    await guestOnlineButton.click();
    await expect(pageGuest.getByText('Online Multiplayer')).toBeVisible();

    const roomInput = pageGuest.getByLabel('Room code');
    await roomInput.fill('P2P1');
    await pageGuest.getByRole('button', { name: 'Join', exact: true }).click();

    // 4. Both peers establish WebRTC and display Connected badge
    await expect(pageHost.getByText('Connected', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(pageGuest.getByText('Connected', { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    await expect(pageHost.getByText('Host (Authority)')).toBeVisible();
    await expect(pageGuest.getByText('Guest (Player 2)')).toBeVisible();

    // 5. Readiness UX: Guest and Host both ready up
    const guestReadyBtn = pageGuest.getByRole('button', { name: /Ready|Click Ready/ });
    await expect(guestReadyBtn).toBeVisible({ timeout: 5_000 });
    await guestReadyBtn.click();

    const hostReadyBtn = pageHost.getByRole('button', { name: /Ready|Click Ready/ });
    await expect(hostReadyBtn).toBeVisible({ timeout: 5_000 });
    await hostReadyBtn.click();

    // Host deals the hand once both are ready
    const hostDealBtn = pageHost.getByRole('button', { name: /Deal hand/ });
    await expect(hostDealBtn).toBeVisible({ timeout: 5_000 });
    await hostDealBtn.click();

    // Verify Dealer hole card is face down on both screens
    await expect(pageHost.getByLabel('Face-down card')).toBeVisible({ timeout: 5_000 });
    await expect(pageGuest.getByLabel('Face-down card')).toBeVisible({ timeout: 5_000 });

    // 6. Host stands on Player 1's turn
    const hostStandBtn = pageHost.getByRole('button', { name: /Stand for Player 1/ });
    await expect(hostStandBtn).toBeVisible({ timeout: 5_000 });
    await expect(hostStandBtn).toBeEnabled();
    await hostStandBtn.click();

    // 7. Turn moves to Player 2 (Guest) who stands
    const guestStandBtn = pageGuest.getByRole('button', { name: /Stand for Player 2/ });
    await expect(guestStandBtn).toBeVisible({ timeout: 5_000 });
    await expect(guestStandBtn).toBeEnabled();
    await guestStandBtn.click();

    // 8. Dealer completes and round ends on both pages
    await expect
      .poll(
        async () => {
          const text = await pageHost.getByRole('status').innerText();
          return /round complete|won|tied|busted|dealer/i.test(text);
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    // Dealer hole card is revealed on both pages after round ends
    await expect(pageHost.getByLabel('Face-down card')).toBeHidden({ timeout: 5_000 });
    await expect(pageGuest.getByLabel('Face-down card')).toBeHidden({ timeout: 5_000 });

    // 9. Rematch interaction: Guest requests rematch
    const guestRematchBtn = pageGuest.getByRole('button', {
      name: /Request Rematch|Rematch/,
      exact: false,
    });
    await expect(guestRematchBtn).toBeVisible({ timeout: 5_000 });
    await guestRematchBtn.click();
    await expect(pageHost.getByText('Guest wants Rematch')).toBeVisible({ timeout: 5_000 });

    // Host accepts rematch (clicks Deal again / Request Rematch)
    const hostRematchBtn = pageHost.getByRole('button', { name: /Deal again|Request Rematch/ });
    await expect(hostRematchBtn).toBeVisible({ timeout: 5_000 });
    await hostRematchBtn.click();

    // New round begins -> face-down card visible again
    await expect(pageHost.getByLabel('Face-down card')).toBeVisible({ timeout: 5_000 });
    await expect(pageGuest.getByLabel('Face-down card')).toBeVisible({ timeout: 5_000 });

    // 10. Disconnect test: Guest leaves room
    await pageGuest.getByRole('button', { name: 'Leave table', exact: true }).click();
    await expect(pageGuest.getByText('Online Multiplayer')).toBeVisible({ timeout: 5_000 });
    await expect(pageHost.getByText('Connection alert')).toBeVisible({
      timeout: 5_000,
    });

    await contextHost.close();
    await contextGuest.close();
  });
});
