# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.network "forwarded_port", guest: 8080, host: 8080

  config.vm.provision "shell", inline: <<-SHELL
    sudo apt-get update
    sudo apt-get upgrade

    # Install Python and dependencies
    sudo apt-get install -y python python-pip python-dev libffi-dev
    cd /vagrant/

    # Install Pillow requirements prior to attempting to install pillow.
    sudo apt-get install libtiff5-dev libjpeg8-dev zlib1g-dev libfreetype6-dev liblcms2-dev libwebp-dev tcl8.6-dev tk8.6-dev python-tk
    sudo pip install -r requirements.txt -t lib

    # Install Google AppEngine
    sudo apt-get install -y unzip
    mkdir /vagrant/build
    cd /vagrant/build
    wget https://storage.googleapis.com/appengine-sdks/featured/google_appengine_1.9.40.zip
    unzip google_appengine_1.9.40.zip

    # Ensure AppEngine commands are added to PATH
    echo "export PATH=$PATH:/vagrant/build/google_appengine/" >> ~/.bashrc

    # Install NodeJS and dependencies
    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Install Global deps
    npm install -g gulp webpack

    cd /vagrant/
    npm install --no-bin-links

  SHELL
end