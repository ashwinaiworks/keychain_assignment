import { test, expect } from '../fixtures';
import { RegisterPage } from '../../lib/pages/register.page';
import { LoginPage } from '../../lib/pages/login.page';
import { HomePage } from '../../lib/pages/home.page';
import { UserFactory } from '../../lib/factories/user.factory';

// ---------------------------------------------------------------------------
// Auth UI — registration, login, logout
// ---------------------------------------------------------------------------

test.describe('Registration flow', () => {
  test('new user can register and lands on the home feed', async ({ page }) => {
    const credentials = UserFactory.buildCredentials();
    const registerPage = new RegisterPage(page);
    const homePage = new HomePage(page);

    await registerPage.goto();
    await registerPage.register(credentials.username, credentials.email, credentials.password);

    await homePage.expectLoggedIn(credentials.username);
  });

  test('registration page links to sign-in', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: 'Have an account?' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('submitting a duplicate email keeps the user on the register page', async ({ page, api }) => {
    // Pre-create the user via API so the email is already taken
    const { credentials } = await UserFactory.create(api);

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillUsername(`other_${Date.now()}`);
    await registerPage.fillEmail(credentials.email);
    await registerPage.fillPassword(credentials.password);
    await registerPage.submit();

    // The app should not navigate away from /register on failure
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Login flow', () => {
  test('existing user can log in and sees their username in the nav', async ({ page, api }) => {
    const { credentials, user } = await UserFactory.create(api);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(credentials.email, credentials.password);

    await expect(page.locator('nav.navbar')).toContainText(user.username);
  });

  test('shows an error for wrong password', async ({ page, api }) => {
    const { credentials } = await UserFactory.create(api);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillEmail(credentials.email);
    await loginPage.fillPassword('WrongPassword!');
    await loginPage.submit();

    await loginPage.expectError('email or password');
  });

  test('login page links to registration', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Need an account?' }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Logout flow', () => {
  test('logged-in user can log out and nav returns to signed-out state', async ({ loggedInPage }) => {
    const { page } = loggedInPage;
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.logout();

    await homePage.expectLoggedOut();
  });
});
