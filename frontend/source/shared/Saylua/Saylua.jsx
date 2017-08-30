import React, { Component } from 'react';

import './Saylua.scss';

import Header from './Header/Header';
import Footer from './Footer/Footer';
import Navbar from './Navbar/Navbar';
import Sidebar from './Sidebar/Sidebar';

// The main Saylua layout component.
export default class Saylua extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.fixNavbar();

    window.addEventListener('scroll', this.fixNavbar);
  }

  fixNavbar() {
    let top = document.getElementById('header').offsetHeight;
    if (document.body.scrollTop > top ||
      document.documentElement.scrollTop > top) {
      document.getElementById('navbar').classList.add('navbar-fixed');
    } else {
      document.getElementById('navbar').classList.remove('navbar-fixed');
    }
  }

  render() {
    let content = this.props.children;
    let title = this.props.title;

    document.title = 'Saylua - ' + (title ? title : 'Adoptable Fantasy Pets');

    return (
      <div id="saylua">
        <Header />
        <Navbar />

        <div id="main-body" className="main-body">
          <Sidebar />
          <div id="main-body-column" className="main-body-column">
            <div id="main-body-content" className="main-body-content">
              { content }
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }
}
