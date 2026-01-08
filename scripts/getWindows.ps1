Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Text;

public class WinInfo {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
    
    public static List<string> GetWindows() {
        var windows = new List<string>();
        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                RECT rect;
                if (GetWindowRect(hWnd, out rect)) {
                    int width = rect.Right - rect.Left;
                    int height = rect.Bottom - rect.Top;
                    if (width > 100 && height > 50 && rect.Top >= 0) {
                        int length = GetWindowTextLength(hWnd);
                        if (length > 0) {
                            StringBuilder sb = new StringBuilder(length + 1);
                            GetWindowText(hWnd, sb, sb.Capacity);
                            string title = sb.ToString();
                            // Filter out system windows and common background processes
                            if (!string.IsNullOrEmpty(title) && 
                                !title.Equals("Program Manager") && 
                                !title.Equals("Microsoft Text Input Application") &&
                                !title.Equals("Settings") &&
                                !title.Equals("Calculatrice") &&
                                !title.Contains("Desktop Mate")) {
                                
                                // Additional check: Ensure window is not a tool window (WS_EX_TOOLWINDOW = 0x80)
                                int exStyle = GetWindowLong(hWnd, -20); // GWL_EXSTYLE
                                
                                // Must NOT be a tool window, AND must be visible
                                if ((exStyle & 0x80) == 0) {
                                     windows.Add(rect.Left + "|" + rect.Top + "|" + width + "|" + height + "|" + title);
                                }
                            }
                        }
                    }
                }
            }
            return true;
        }, IntPtr.Zero);
        return windows;
    }
}
"@

[WinInfo]::GetWindows() | ForEach-Object { Write-Output $_ }
