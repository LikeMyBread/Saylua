import Inferno from "inferno";
import Component from "inferno-component";
import BlockGrid from "./BlockGrid";

// The overall game interface for tetris.
export default class BlocksInterface extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentWillMount() {
    // Make sure that when our model updates, we do too.
    this.props.model.bindComponent(this);

    // Match keyboard presses to events.
    this.eventListener = window.addEventListener("keydown", this.handleKeydown.bind(this));
    this.eventListener = window.addEventListener("keyup", this.handleKeyup.bind(this));
  }

  handleKeydown(event) {
    if (!event) return;
    let tag = event.target.tagName.toLowerCase();
    //  Make sure keys can still be inputted if a form is focused.
    if (tag == 'input' || tag == 'textarea') return;
    this.props.model.keyState[event.keyCode || event.which] = true;
    event.preventDefault();
  }

  handleKeyup(event) {
    if (!event) return;
    let tag = event.target.tagName.toLowerCase();
    //  Make sure keys can still be inputted if a form is focused.
    if (tag == 'input' || tag == 'textarea') return;
    this.props.model.keyState[event.keyCode || event.which] = false;
    event.preventDefault();
  }

  render() {
    let game = this.props.model;
    let overlay = '';
    let prizeText = 'Sending score...';
    if (game.scoreSent) {
      prizeText = `You earned ${game.score} Cloud Coins!`;
    }
    if (game.gameOver) {
      // Game over state.
      overlay = (
        <div className='blocks-overlay'>
          <span className='blocks-big-text'>Game Over</span>
          <span>Score: { game.score }</span>
          <span className='blocks-small-text'>{ prizeText }</span>
          <span className='blocks-click-text' onClick={ game.start.bind(game) }>Try again?</span>
        </div>
      );
    } else if (game.paused) {
      // Paused state.
      overlay = (
        <div className='blocks-overlay'>
          <span className='blocks-big-text'>Paused</span>
          <span className='blocks-click-text' onClick={ game.pause.bind(game) }>Resume Playing</span>
        </div>
      );
    } else if (!game.isRunning()) {
      // Start screen.
      return (
        <div className='blocks-container'>
          <div className='blocks-start-screen'>
            <span className='blocks-start-game' onClick={ game.start.bind(game) }>
              Start Game
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className='blocks-container'>
        { overlay }
        <div className='game-view'>
          <div className='blocks-info'>
            <div className='blocks-next-piece'>
              <BlockGrid matrix={ game.nextPiece } />
            </div>
            <div className='blocks-score'>
              Score: { game.score }
            </div>
            <div className='blocks-controls'>
              &larr;&rarr; - Move
              <br />&uarr;- Rotate
              <br />&darr; - Speedup
              <br />Space - Drop
              <br />P - Pause
            </div>
          </div>
          <BlockGrid className='blocks-grid' matrix={ game.gameMatrix } />
        </div>
        <div className='game-buttons'>
          <button onClick={ game.moveLeft.bind(game) }>
            &larr;
            <small>Left</small>
          </button>
          <button onClick={ game.moveRight.bind(game) }>
            &rarr;
            <small>Right</small>
          </button>
          <button onClick={ game.rotate.bind(game) }>
            &uarr;
            <small>Rotate</small>
          </button>
          <button onClick={ game.drop.bind(game) }>
            &#x268A;
            <small>Drop</small>
          </button>
          <button onClick={ game.pause.bind(game) }>
            P
            <small>Pause</small>
          </button>
        </div>
      </div>
    );
  }
}
