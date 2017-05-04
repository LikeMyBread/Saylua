from saylua import app
from wtforms import Form
from flask_wtf.recaptcha import RecaptchaField, Recaptcha
from saylua.utils.form import sl_validators, UserCheck
from saylua.utils.form.fields import SlField, SlPasswordField

login_check = UserCheck()


class LoginForm(Form):
    username_or_email = SlField('Username/Email', [
        sl_validators.Required(),
        sl_validators.UsernameOrEmail(),
        login_check.UsernameOrEmailExists])
    password = SlPasswordField('Password', [
        sl_validators.Required(),
        login_check.PasswordValid])


class RecoveryForm(Form):
    username_or_email = SlField('Username/Email', [
        sl_validators.Required(),
        sl_validators.UsernameOrEmail(),
        login_check.UsernameOrEmailExists])
    recaptcha = RecaptchaField(validators=[Recaptcha(message='Please check the CAPTCHA.')])


class PasswordResetForm(Form):
    password = SlPasswordField('New Password', [
        sl_validators.Required(),
        sl_validators.Min(app.config['MIN_PASSWORD_LENGTH']),
        sl_validators.Max(app.config['MAX_PASSWORD_LENGTH'])
    ])
    confirm_password = SlPasswordField('Confirm Password', [
        sl_validators.EqualTo('password', message='Passwords must match.')
    ])
