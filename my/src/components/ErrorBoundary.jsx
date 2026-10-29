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
    if (this.state.failed)
      return (
        <main className="page not-found">
          <div className="eyebrow dark">{i18n.t("common.errorBoundaryTitle")}</div>
          <h1>{i18n.t("common.errorBoundaryText")}</h1>
          <button
            className="button button-dark"
            onClick={() => this.setState({ failed: false })}
          >
            {i18n.t("common.tryAgain")} ↗
          </button>
        </main>
      );
    return this.props.children;
  }
}
