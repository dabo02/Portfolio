from flask import Flask, render_template, request, redirect, url_for
from flask_mail import Message, Mail

app = Flask(__name__)
app.config.update(DEBUG = True,
    MAIL_SERVER = 'smtp.live.com',
    MAIL_PORT = 587,
    MAIL_USE_TLS = True,
    MAIL_USE_SSL = False,
    MAIL_USERNAME = 'dabo_02@live.com',
    MAIL_PASSWORD = 'nomeronques2',
    DEFAULT_MAIL_SENDER = 'dabo_02@live.com')
mail = Mail(app)
@app.route('/')
def my_site():
    return render_template('index.html')


@app.route('/send_email', methods=['POST'])
def send_email():
    name = request.form['name']
    email = request.form['email']
    subj = request.form['subject']
    msg = request.form['message']
    mail_to_send = Message(subject=subj,
                           recipients=['dabo021213@gmail.com'],
                           body=msg + ' From: ' + name + ' with email: ' + email,
                           sender=(name, email))
    # Send the message via our own SMTP server.
    mail.send(mail_to_send)
    return redirect('/', code=301)


@app.route('/video_chat')
def video_chat():
    return render_template('video_chat.html')

if __name__ == '__main__':
    import socket as s
    if 'liveconsole' not in s.gethostname():
        mail.init_app(app)
        app.run()
