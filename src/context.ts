import React from 'react';

export type AppContextType = {
    isDarkTheme(): boolean;
}
const AppContext = React.createContext<AppContextType>({} as AppContextType);
export default AppContext;
