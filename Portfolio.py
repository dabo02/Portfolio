from flask import Flask, render_template, request, redirect, url_for
import requests
import socket as s
import os
app = Flask(__name__)
host = s.gethostname()


@app.route('/')
def my_site():
    return render_template('index.html')


@app.route('/send_email', methods=['POST'])
def send_email():
    name = request.form['name']
    email = request.form['email']
    subj = request.form['subject']
    msg = request.form['message']

    response = requests.post(
        "https://api.mailgun.net/v3/sandbox899adf0b99c34a8786fd14968a854150.mailgun.org/messages",
        auth=("api", os.environ.get('API_KEY')),
        data={"from": 'Name: ' + name + ' Email: ' + email,
              "to": "Francisco Burgos <dabo021213@gmail.com>",
              "subject": subj,
              "text": msg})

    return redirect('/', code=301)


@app.route('/video_chat')
def video_chat():
    return render_template('video_chat.html')

if __name__ == '__main__':
    if 'liveconsole' not in host:
        app.run()
