from flask import Flask, render_template, request, redirect, url_for
from flask_mail import Message, Mail

app = Flask(__name__)
mail = Mail(app)


@app.route('/')
def my_site():
    return render_template('index.html')


@app.route('/send_email', methods=['POST'])
def send_email():
    name = request.form['name']
    email = request.form['email']
    subj = request.form['subject'] + ' from ' + name
    msg = request.form['message']
    mail_to_send = Message(subject=subj,
                           recipients=['dabo021213@gmail.com'],
                           body=msg,
                           sender=email)
    # Send the message via our own SMTP server.
    mail.send(mail_to_send)
    return redirect('/', code=200)

if __name__ == '__main__':
    import socket as s
    if 'liveconsole' not in s.gethostname():
        app.config['DEBUG'] = True
        mail.init_app(app)
        app.run()
