import { Component } from "react";
import i18n from "i18next";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Travel KG UI error:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page not-found">
        <div className="eyebrow">{i18n.t("common.errorBoundaryTitle")}</div>
        <h1>{i18n.t("common.errorBoundaryText")}</h1>
        <div className="button-row center">
          <button className="button button-primary" onClick={() => this.setState({ failed: false })}>
            {i18n.t("common.tryAgain")}
          </button>
          <a className="button button-ghost" href="/">
            {i18n.t("common.toHome")}
          </a>
        </div>
      </main>
    );
  }
}
