from flask import Flask, render_template, request, redirect, url_for
from flask_mail import Message, Mail
import socket as s
import os
app = Flask(__name__)
host = s.gethostname()
mail = Mail(app)
if 'liveconsole' not in host:
    app.config.update(DEBUG = True,
        MAIL_SERVER = 'smtp.live.com',
        MAIL_PORT = 587,
        MAIL_USE_TLS = True,
        MAIL_USE_SSL = False,
        MAIL_USERNAME = os.environ.get('MAIL_USERNAME'),
        MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD'),
        DEFAULT_MAIL_SENDER = os.environ.get('MAIL_USERNAME'))
else:
    app.config.update(DEBUG = True,
                      MAIL_SERVER = 'smtp.gmail.com',
                      MAIL_PORT = 587,
                      MAIL_USE_TLS = True,
                      MAIL_USE_SSL = False,
                      MAIL_USERNAME = os.environ.get('MAIL_USERNAME'),
                      MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD'),
                      DEFAULT_MAIL_SENDER = os.environ.get('MAIL_USERNAME'))


@app.route('/')
def my_site():
    return render_template('index.html')


@app.route('/send_email', methods=['POST'])
def send_email():
    name = request.form['name']
    email = request.form['email']
    subj = request.form['subject']
    msg = request.form['message']
    if 'liveconsole' not in host:
        mail_to_send = Message(subject=subj,
                               recipients=['dabo021213@gmail.com'],
                               body=msg + ' From: ' + name + ' with email: ' + email,
                               sender=(name, email))
    else:
        mail_to_send = Message(subject=subj,
                               recipients=['dabo_02@live.com'],
                               body=msg + ' From: ' + name + ' with email: ' + email,
                               sender=(name, email))
    mail.send(mail_to_send)
    return redirect('/', code=301)


@app.route('/video_chat')
def video_chat():
    return render_template('video_chat.html')

if __name__ == '__main__':
    if 'liveconsole' not in host:
        mail.init_app(app)
        app.run()
