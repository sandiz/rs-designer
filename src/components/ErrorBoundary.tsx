import React, { ErrorInfo } from 'react'
import {
    Callout, Intent, Collapse, Pre, Button,
} from '@blueprintjs/core';
import classNames from 'classnames';

interface EBState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    showDetails: boolean;
}
interface EBProps {
    className: string;
}
class ErrorBoundary extends React.Component<EBProps, EBState> {
    constructor(props: EBProps) {
        super(props);
        this.state = {
            hasError: false, error: null, errorInfo: null, showDetails: false,
        };
    }

    static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can also log the error to an error reporting service
        //logErrorToMyService(error, errorInfo);
        this.setState({ error, errorInfo })
    }

    render() {
        if (this.state.hasError) {
            const { showDetails } = this.state;
            // You can render any custom fallback UI
            return (
                <Callout
                    className={classNames(this.props.className, "error-callout")}
                    intent={Intent.DANGER}
                >
                    Something went wrong, please restart the app. Error: {this.state.error?.message}
                    <Button minimal className="error-button-report">Report</Button>
                    <Button minimal className="error-button-detail" onClick={() => this.setState({ showDetails: !showDetails })}>Details</Button>
                    <Collapse isOpen={this.state.showDetails}>
                        <Pre className="error-pre number">
                            Stacktrace:
                            {this.state.errorInfo?.componentStack}
                        </Pre>
                    </Collapse>
                </Callout>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
